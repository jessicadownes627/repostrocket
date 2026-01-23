const { onObjectFinalized } = require("firebase-functions/v2/storage");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.onBatchUploadFinalize = onObjectFinalized(
  {
    region: "us-central1",
  },
  async (event) => {
    const object = event.data;
    const filePath = object.name;

    if (!filePath) {
      logger.info("No file path, exiting");
      return;
    }

    // Only process batch uploads
    const canonicalMatch = filePath.match(
      /^batch\/([^/]+)\/uploads\/([^/]+)\.jpg$/i
    );
    const flatMatch = filePath.match(/^uploads\/([^/]+)\/([^/]+)\.jpg$/i);

    if (!canonicalMatch && !flatMatch) {
      logger.info("Not a batch upload, skipping:", filePath);
      return;
    }

    const batchId = canonicalMatch ? canonicalMatch[1] : flatMatch[1];
    const uploadId = canonicalMatch ? canonicalMatch[2] : flatMatch[2];

    const db = admin.firestore();
    const batchRef = db.collection("batches").doc(batchId);
    const uploadRef = batchRef.collection("uploads").doc(uploadId);
    const cardsCol = batchRef.collection("cards");
    const uploadTime = object.timeCreated
      ? admin.firestore.Timestamp.fromDate(new Date(object.timeCreated))
      : admin.firestore.Timestamp.now();
    const timeThresholdHighMs = 5000;
    const timeThresholdMediumMs = 15000;

    const batchSnap = await batchRef.get();
    if (!batchSnap.exists) {
      await batchRef.set(
        {
          userId: "anonymous",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          maxUploads: 50,
          totalUploads: 0,
          processedUploads: 0,
          pairedCards: 0,
          status: "uploading",
        },
        { merge: true }
      );
      logger.info("Batch not found, created:", batchId);
    }

    await db.runTransaction(async (tx) => {
      const batchSnapTx = await tx.get(batchRef);
      const batchData = batchSnapTx.data() || {};

      const uploadSnap = await tx.get(uploadRef);
      if (!uploadSnap.exists) {
        logger.warn("Upload doc not found:", uploadId);
        return;
      }

      const uploadData = uploadSnap.data() || {};
      if (uploadData.status !== "pending") {
        logger.info("EXIT_ALREADY_PROCESSED", {
          batchId,
          uploadId,
          reason: "Upload status is not pending",
        });
        return;
      }
      if (uploadData.cardId) {
        logger.info("EXIT_ALREADY_ASSIGNED_TO_CARD", {
          batchId,
          uploadId,
          reason: "Upload already has cardId",
        });
        return;
      }

      const batchStatus = batchData.status || "uploading";
      if (batchStatus !== "uploading" && batchStatus !== "processing") {
        logger.info("EXIT_BATCH_NOT_ACTIVE", {
          batchId,
          uploadId,
          reason: `Batch status is ${batchStatus}`,
        });
        return;
      }

      const cardsQuery = cardsCol
        .where("status", "==", "draft")
        .where("locked", "==", false)
        .orderBy("updatedAt", "desc")
        .limit(5);
      const cardsSnap = await tx.get(cardsQuery);
      const candidates = [];
      cardsSnap.forEach((docSnap) => {
        const data = docSnap.data() || {};
        if (data.pairingLocked === true) {
          return;
        }
        candidates.push({ id: docSnap.id, data });
      });

      const uploadsQuery = batchRef
        .collection("uploads")
        .where("status", "==", "processed");
      const uploadsSnap = await tx.get(uploadsQuery);
      const unpairedUploads = [];
      uploadsSnap.forEach((docSnap) => {
        const data = docSnap.data() || {};
        if (data.paired === true) return;
        if (data.cardId) return;
        unpairedUploads.push({
          id: docSnap.id,
          data,
        });
      });

      const uploadCreatedAt =
        uploadData.createdAt || uploadTime || admin.firestore.Timestamp.now();

      const pickCardByTiming = (thresholdMs) => {
        for (const candidate of candidates) {
          const updatedAt = candidate.data.updatedAt || candidate.data.createdAt;
          if (!updatedAt) continue;
          const diffMs = Math.abs(
            uploadCreatedAt.toMillis() - updatedAt.toMillis()
          );
          if (diffMs <= thresholdMs) {
            return candidate;
          }
        }
        return null;
      };

      const attachToCard = (candidate, confidence, reason, lockCard) => {
        const card = candidate.data || {};
        if (card.pairingLocked === true) {
          return false;
        }
        const updates = {
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          confidence,
          reason,
          needsReview: false,
          locked: Boolean(lockCard),
        };
        if (!card.frontUploadId) {
          updates.frontUploadId = uploadId;
        } else if (!card.backUploadId) {
          updates.backUploadId = uploadId;
        } else {
          return false;
        }
        const frontFinal = updates.frontUploadId || card.frontUploadId;
        const backFinal = updates.backUploadId || card.backUploadId;
        updates.status = frontFinal && backFinal ? "complete" : "draft";
        if (updates.status !== "complete") {
          updates.locked = false;
        }
        tx.update(cardsCol.doc(candidate.id), updates);
        tx.update(uploadRef, { cardId: candidate.id });
        logger.info("Paired upload to existing card", {
          batchId,
          uploadId,
          cardId: candidate.id,
          confidence,
          reason,
          locked: Boolean(lockCard),
        });
        return true;
      };

      const newestCard = candidates.length ? candidates[0] : null;
      const newestNeedsSlot =
        newestCard &&
        (!newestCard.data.frontUploadId || !newestCard.data.backUploadId);

      let handled = false;
      if (newestNeedsSlot) {
        const updatedAt = newestCard.data.updatedAt || newestCard.data.createdAt;
        if (updatedAt) {
          const diffMs = Math.abs(
            uploadCreatedAt.toMillis() - updatedAt.toMillis()
          );
          if (diffMs <= timeThresholdHighMs) {
            handled = attachToCard(
              newestCard,
              "high",
              "Uploaded sequentially",
              true
            );
          }
        }
      }

      if (!handled && candidates.length) {
        const timedCandidate = pickCardByTiming(timeThresholdMediumMs);
        if (timedCandidate) {
          handled = attachToCard(
            timedCandidate,
            "medium",
            "Paired by upload timing",
            false
          );
        }
      }

      const uploadCandidates = [
        ...unpairedUploads,
        { id: uploadId, data: { ...uploadData, status: "processed" } },
      ];

      if (!handled) {
        const frontCandidate = uploadCandidates.find(
          (entry) =>
            /front/i.test(entry.id) &&
            entry.data.paired !== true &&
            !entry.data.cardId
        );
        const backCandidate = uploadCandidates.find(
          (entry) =>
            /back/i.test(entry.id) &&
            entry.data.paired !== true &&
            !entry.data.cardId
        );

        if (frontCandidate && backCandidate) {
          const newCardRef = cardsCol.doc();
          tx.set(newCardRef, {
            frontUploadId: frontCandidate.id,
            backUploadId: backCandidate.id,
            status: "complete",
            confidence: "high",
            reason: "Paired by filename",
            locked: true,
            needsReview: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          tx.update(batchRef, {
            pairedCards: admin.firestore.FieldValue.increment(1),
          });
          tx.update(batchRef.collection("uploads").doc(frontCandidate.id), {
            paired: true,
            cardId: newCardRef.id,
          });
          tx.update(batchRef.collection("uploads").doc(backCandidate.id), {
            paired: true,
            cardId: newCardRef.id,
          });
          logger.info("Paired uploads by filename", {
            batchId,
            frontUploadId: frontCandidate.id,
            backUploadId: backCandidate.id,
            cardId: newCardRef.id,
          });
          handled = true;
        }
      }

      if (!handled) {
        const newCardRef = cardsCol.doc();
        tx.set(newCardRef, {
          frontUploadId: uploadId,
          backUploadId: null,
          status: "draft",
          confidence: "low",
          reason: "Needs user confirmation",
          locked: false,
          needsReview: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        tx.update(uploadRef, { cardId: newCardRef.id });
        logger.info("Created new draft card for upload", {
          batchId,
          uploadId,
          cardId: newCardRef.id,
          confidence: "low",
          reason: "Needs user confirmation",
        });
      }

      const totalUploads = Number(batchData.totalUploads || 0);
      const processedUploads = Number(batchData.processedUploads || 0);
      const nextProcessed = processedUploads + 1;

      const batchUpdates = {
        processedUploads: admin.firestore.FieldValue.increment(1),
      };

      if (totalUploads && nextProcessed >= totalUploads) {
        batchUpdates.status = "processing";
      }

      tx.update(batchRef, batchUpdates);
      tx.update(uploadRef, { status: "processed" });
    });

    logger.info("Processed upload:", uploadId);
  }
);
