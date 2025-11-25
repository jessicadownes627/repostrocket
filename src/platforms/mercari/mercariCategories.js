// ---------------------------------------------
// MERCARI HYBRID CATEGORY TAXONOMY (CHUNK A)
// Base structure + helper functions
// ---------------------------------------------

// Each category node added in later chunks will follow:
// {
//   name: "Tops",
//   path: ["Women", "Tops"],
//   aliases: ["top", "blouse", "shirt"], // optional
//   children: [] // optional
// }

export const mercariCategories = {
  Women: {
    name: "Women",
    path: ["Women"],
    aliases: ["womens", "women's", "ladies", "female"],
    children: {
      Tops: {
        name: "Tops",
        path: ["Women", "Tops"],
        aliases: ["shirt", "top", "blouse", "tank", "tee", "t-shirt"],
        children: {
          Blouses: {
            name: "Blouses",
            path: ["Women", "Tops", "Blouses"],
            aliases: ["blouse", "dressy top", "chiffon top", "flowy top"],
          },
          "T-Shirts": {
            name: "T-Shirts",
            path: ["Women", "Tops", "T-Shirts"],
            aliases: ["tshirt", "tee", "graphic tee", "oversized tee"],
          },
          "Tank Tops": {
            name: "Tank Tops",
            path: ["Women", "Tops", "Tank Tops"],
            aliases: ["tank", "cami", "camisole", "sleeveless top"],
          },
          Sweaters: {
            name: "Sweaters",
            path: ["Women", "Tops", "Sweaters"],
            aliases: ["knit", "knitted", "knit sweater", "pullover"],
          },
          "Sweatshirts & Hoodies": {
            name: "Sweatshirts & Hoodies",
            path: ["Women", "Tops", "Sweatshirts & Hoodies"],
            aliases: ["hoodie", "hooded sweatshirt", "zip hoodie", "crewneck"],
          },
          "Button-Down Shirts": {
            name: "Button-Down Shirts",
            path: ["Women", "Tops", "Button-Down Shirts"],
            aliases: ["button down", "collared shirt", "button up"],
          },
          Bodysuits: {
            name: "Bodysuits",
            path: ["Women", "Tops", "Bodysuits"],
            aliases: ["bodysuit", "one-piece top"],
          },
        },
      },

      Dresses: {
        name: "Dresses",
        path: ["Women", "Dresses"],
        aliases: ["dress", "gown", "evening dress", "maxi dress"],
        children: {
          "Casual Dresses": {
            name: "Casual Dresses",
            path: ["Women", "Dresses", "Casual Dresses"],
            aliases: ["sundress", "day dress"],
          },
          "Formal Dresses": {
            name: "Formal Dresses",
            path: ["Women", "Dresses", "Formal Dresses"],
            aliases: ["gown", "prom dress", "evening gown"],
          },
          "Maxi Dresses": {
            name: "Maxi Dresses",
            path: ["Women", "Dresses", "Maxi Dresses"],
            aliases: ["maxi dress", "long dress", "floor length dress"],
          },
          "Mini Dresses": {
            name: "Mini Dresses",
            path: ["Women", "Dresses", "Mini Dresses"],
            aliases: ["mini", "short dress", "above knee dress"],
          },
          "Midi Dresses": {
            name: "Midi Dresses",
            path: ["Women", "Dresses", "Midi Dresses"],
            aliases: ["midi", "mid-length dress"],
          },
        },
      },

      Shoes: {
        name: "Shoes",
        path: ["Women", "Shoes"],
        aliases: ["shoes", "footwear"],
        children: {
          Heels: {
            name: "Heels",
            path: ["Women", "Shoes", "Heels"],
            aliases: ["pumps", "stilettos", "high heels"],
          },
          Boots: {
            name: "Boots",
            path: ["Women", "Shoes", "Boots"],
            aliases: ["booties", "ankle boots", "knee high boots"],
          },
          Sneakers: {
            name: "Sneakers",
            path: ["Women", "Shoes", "Sneakers"],
            aliases: ["tennis shoes", "athletic shoes", "running shoes"],
          },
          Sandals: {
            name: "Sandals",
            path: ["Women", "Shoes", "Sandals"],
            aliases: ["flip flops", "slides", "gladiator sandals"],
          },
          Flats: {
            name: "Flats",
            path: ["Women", "Shoes", "Flats"],
            aliases: ["ballet flats", "loafers"],
          },
        },
      },

      Bottoms: {
        name: "Bottoms",
        path: ["Women", "Bottoms"],
        aliases: ["pants", "skirts", "jeans"],
        children: {
          Jeans: {
            name: "Jeans",
            path: ["Women", "Bottoms", "Jeans"],
            aliases: ["denim", "mom jeans", "skinny jeans", "high rise"],
          },
          Shorts: {
            name: "Shorts",
            path: ["Women", "Bottoms", "Shorts"],
            aliases: ["denim shorts", "bike shorts"],
          },
          Skirts: {
            name: "Skirts",
            path: ["Women", "Bottoms", "Skirts"],
            aliases: ["mini skirt", "midi skirt", "maxi skirt"],
          },
          Leggings: {
            name: "Leggings",
            path: ["Women", "Bottoms", "Leggings"],
            aliases: ["yoga pants", "athletic leggings"],
          },
          "Dress Pants": {
            name: "Dress Pants",
            path: ["Women", "Bottoms", "Dress Pants"],
            aliases: ["slacks", "trousers"],
          },
        },
      },

      Outerwear: {
        name: "Outerwear",
        path: ["Women", "Outerwear"],
        aliases: ["coat", "jacket", "outer layer"],
        children: {
          Coats: {
            name: "Coats",
            path: ["Women", "Outerwear", "Coats"],
            aliases: ["winter coat", "overcoat", "puffer coat"],
          },
          Jackets: {
            name: "Jackets",
            path: ["Women", "Outerwear", "Jackets"],
            aliases: ["denim jacket", "leather jacket", "bomber"],
          },
          Vests: {
            name: "Vests",
            path: ["Women", "Outerwear", "Vests"],
            aliases: ["puffer vest", "fleece vest"],
          },
        },
      },

      Activewear: {
        name: "Activewear",
        path: ["Women", "Activewear"],
        aliases: ["workout", "gym", "athletic"],
        children: {
          "Sports Bras": {
            name: "Sports Bras",
            path: ["Women", "Activewear", "Sports Bras"],
            aliases: ["sports bra", "athletic bra"],
          },
          "Athletic Tops": {
            name: "Athletic Tops",
            path: ["Women", "Activewear", "Athletic Tops"],
            aliases: ["performance top", "gym shirt"],
          },
          "Athletic Leggings": {
            name: "Athletic Leggings",
            path: ["Women", "Activewear", "Athletic Leggings"],
            aliases: ["workout leggings", "yoga leggings"],
          },
        },
      },

      Accessories: {
        name: "Accessories",
        path: ["Women", "Accessories"],
        aliases: ["accessories", "jewelry", "bags"],
        children: {
          Bags: {
            name: "Bags",
            path: ["Women", "Accessories", "Bags"],
            aliases: ["purse", "handbag", "crossbody", "shoulder bag"],
          },
          Jewelry: {
            name: "Jewelry",
            path: ["Women", "Accessories", "Jewelry"],
            aliases: ["necklace", "bracelet", "earrings"],
          },
          Hats: {
            name: "Hats",
            path: ["Women", "Accessories", "Hats"],
            aliases: ["sun hat", "beanie"],
          },
          Scarves: {
            name: "Scarves",
            path: ["Women", "Accessories", "Scarves"],
            aliases: ["wrap", "shawl"],
          },
          Belts: {
            name: "Belts",
            path: ["Women", "Accessories", "Belts"],
            aliases: ["waist belt", "leather belt"],
          },
        },
      },

      Intimates: {
        name: "Intimates",
        path: ["Women", "Intimates"],
        aliases: ["lingerie", "bra", "underwear"],
        children: {
          Bras: {
            name: "Bras",
            path: ["Women", "Intimates", "Bras"],
            aliases: ["bra", "bralette"],
          },
          Underwear: {
            name: "Underwear",
            path: ["Women", "Intimates", "Underwear"],
            aliases: ["panties", "briefs"],
          },
          Shapewear: {
            name: "Shapewear",
            path: ["Women", "Intimates", "Shapewear"],
            aliases: ["slip", "control top"],
          },
        },
      },
    },
  },
  Men: {
    name: "Men",
    path: ["Men"],
    aliases: ["mens", "men's", "male"],
    children: {
      Tops: {
        name: "Tops",
        path: ["Men", "Tops"],
        aliases: ["shirt", "tee", "t-shirt", "tank", "top"],
        children: {
          "T-Shirts": {
            name: "T-Shirts",
            path: ["Men", "Tops", "T-Shirts"],
            aliases: ["tee", "graphic tee", "crew neck", "v neck"],
          },
          "Button-Down Shirts": {
            name: "Button-Down Shirts",
            path: ["Men", "Tops", "Button-Down Shirts"],
            aliases: ["button down", "dress shirt", "collared shirt"],
          },
          "Sweatshirts & Hoodies": {
            name: "Sweatshirts & Hoodies",
            path: ["Men", "Tops", "Sweatshirts & Hoodies"],
            aliases: ["hoodie", "crewneck", "pullover", "zip hoodie"],
          },
          Sweaters: {
            name: "Sweaters",
            path: ["Men", "Tops", "Sweaters"],
            aliases: ["knit", "pullover sweater"],
          },
          "Tank Tops": {
            name: "Tank Tops",
            path: ["Men", "Tops", "Tank Tops"],
            aliases: ["tank", "muscle shirt"],
          },
        },
      },

      Bottoms: {
        name: "Bottoms",
        path: ["Men", "Bottoms"],
        aliases: ["pants", "shorts", "jeans"],
        children: {
          Jeans: {
            name: "Jeans",
            path: ["Men", "Bottoms", "Jeans"],
            aliases: ["denim", "straight leg", "relaxed fit", "skinny jeans"],
          },
          Shorts: {
            name: "Shorts",
            path: ["Men", "Bottoms", "Shorts"],
            aliases: ["cargo shorts", "athletic shorts"],
          },
          Chinos: {
            name: "Chinos",
            path: ["Men", "Bottoms", "Chinos"],
            aliases: ["khakis", "casual pants"],
          },
          Joggers: {
            name: "Joggers",
            path: ["Men", "Bottoms", "Joggers"],
            aliases: ["sweatpants", "track pants"],
          },
        },
      },

      Outerwear: {
        name: "Outerwear",
        path: ["Men", "Outerwear"],
        aliases: ["jacket", "coat"],
        children: {
          Jackets: {
            name: "Jackets",
            path: ["Men", "Outerwear", "Jackets"],
            aliases: ["denim jacket", "bomber jacket", "track jacket"],
          },
          Coats: {
            name: "Coats",
            path: ["Men", "Outerwear", "Coats"],
            aliases: ["peacoat", "trench coat", "winter coat"],
          },
          Vests: {
            name: "Vests",
            path: ["Men", "Outerwear", "Vests"],
            aliases: ["puffer vest", "fleece vest"],
          },
        },
      },

      Shoes: {
        name: "Shoes",
        path: ["Men", "Shoes"],
        aliases: ["footwear", "shoes"],
        children: {
          Sneakers: {
            name: "Sneakers",
            path: ["Men", "Shoes", "Sneakers"],
            aliases: ["running shoes", "athletic shoes", "trainers"],
          },
          Boots: {
            name: "Boots",
            path: ["Men", "Shoes", "Boots"],
            aliases: ["work boots", "chelsea boots"],
          },
          Sandals: {
            name: "Sandals",
            path: ["Men", "Shoes", "Sandals"],
            aliases: ["slides", "flip flops"],
          },
          "Dress Shoes": {
            name: "Dress Shoes",
            path: ["Men", "Shoes", "Dress Shoes"],
            aliases: ["oxfords", "loafers", "formal shoes"],
          },
        },
      },

      Activewear: {
        name: "Activewear",
        path: ["Men", "Activewear"],
        aliases: ["athletic", "gym", "workout"],
        children: {
          "Athletic Tops": {
            name: "Athletic Tops",
            path: ["Men", "Activewear", "Athletic Tops"],
            aliases: ["performance shirt", "dry fit top"],
          },
          "Athletic Shorts": {
            name: "Athletic Shorts",
            path: ["Men", "Activewear", "Athletic Shorts"],
            aliases: ["running shorts", "basketball shorts"],
          },
          "Athletic Pants": {
            name: "Athletic Pants",
            path: ["Men", "Activewear", "Athletic Pants"],
            aliases: ["track pants", "gym pants"],
          },
        },
      },

      Accessories: {
        name: "Accessories",
        path: ["Men", "Accessories"],
        aliases: ["accessories", "bags", "hats"],
        children: {
          Hats: {
            name: "Hats",
            path: ["Men", "Accessories", "Hats"],
            aliases: ["cap", "beanie", "snapback"],
          },
          Bags: {
            name: "Bags",
            path: ["Men", "Accessories", "Bags"],
            aliases: ["backpack", "crossbody bag", "messenger bag"],
          },
          Belts: {
            name: "Belts",
            path: ["Men", "Accessories", "Belts"],
            aliases: ["leather belt"],
          },
          Wallets: {
            name: "Wallets",
            path: ["Men", "Accessories", "Wallets"],
            aliases: ["cardholder", "bifold"],
          },
        },
      },

      Suits: {
        name: "Suits",
        path: ["Men", "Suits"],
        aliases: ["suit", "formalwear"],
        children: {
          "Suit Jackets": {
            name: "Suit Jackets",
            path: ["Men", "Suits", "Suit Jackets"],
            aliases: ["blazer", "sportcoat"],
          },
          "Dress Pants": {
            name: "Dress Pants",
            path: ["Men", "Suits", "Dress Pants"],
            aliases: ["slacks", "trousers"],
          },
          "Full Suits": {
            name: "Full Suits",
            path: ["Men", "Suits", "Full Suits"],
            aliases: ["two piece suit", "three piece suit"],
          },
        },
      },
    },
  },
  Kids: {
    name: "Kids",
    path: ["Kids"],
    aliases: ["kid", "children", "child", "toddler", "youth"],
    children: {},
  },
  "Sports & Outdoors": {
    name: "Sports & Outdoors",
    path: ["Sports & Outdoors"],
    aliases: ["sports", "outdoor", "fitness", "gym"],
    children: {
      "Fitness Equipment": {
        name: "Fitness Equipment",
        path: ["Sports & Outdoors", "Fitness Equipment"],
        aliases: ["dumbbell", "weights", "kettlebell", "barbell", "resistance band", "exercise equipment", "workout gear"],
        children: {
          "Weights & Dumbbells": {
            name: "Weights & Dumbbells",
            path: ["Sports & Outdoors", "Fitness Equipment", "Weights & Dumbbells"],
            aliases: ["weights", "dumbbell", "kettlebell"],
          },
          "Resistance Bands": {
            name: "Resistance Bands",
            path: ["Sports & Outdoors", "Fitness Equipment", "Resistance Bands"],
            aliases: ["resistance band", "workout band"],
          },
          "Yoga & Pilates": {
            name: "Yoga & Pilates",
            path: ["Sports & Outdoors", "Fitness Equipment", "Yoga & Pilates"],
            aliases: ["yoga mat", "pilates ring", "yoga block"],
          },
        },
      },

      Cycling: {
        name: "Cycling",
        path: ["Sports & Outdoors", "Cycling"],
        aliases: ["bike", "bicycle", "cycling gear", "helmet"],
        children: {
          Bikes: {
            name: "Bikes",
            path: ["Sports & Outdoors", "Cycling", "Bikes"],
            aliases: ["mountain bike", "road bike", "bmx"],
          },
          Helmets: {
            name: "Helmets",
            path: ["Sports & Outdoors", "Cycling", "Helmets"],
            aliases: ["helmet", "bike helmet"],
          },
          "Cycling Accessories": {
            name: "Cycling Accessories",
            path: ["Sports & Outdoors", "Cycling", "Cycling Accessories"],
            aliases: ["bike pump", "bike lock", "cycling gloves"],
          },
        },
      },

      "Outdoor Gear": {
        name: "Outdoor Gear",
        path: ["Sports & Outdoors", "Outdoor Gear"],
        aliases: ["camping", "hiking", "tent", "backpack", "lantern"],
        children: {
          Camping: {
            name: "Camping",
            path: ["Sports & Outdoors", "Outdoor Gear", "Camping"],
            aliases: ["tent", "sleeping bag", "camp stove"],
          },
          Hiking: {
            name: "Hiking",
            path: ["Sports & Outdoors", "Outdoor Gear", "Hiking"],
            aliases: ["hiking boots", "trekking poles"],
          },
          Backpacks: {
            name: "Backpacks",
            path: ["Sports & Outdoors", "Outdoor Gear", "Backpacks"],
            aliases: ["hiking backpack", "camping pack"],
          },
        },
      },

      "Team Sports": {
        name: "Team Sports",
        path: ["Sports & Outdoors", "Team Sports"],
        aliases: ["football", "soccer", "baseball", "basketball", "volleyball"],
        children: {
          Soccer: {
            name: "Soccer",
            path: ["Sports & Outdoors", "Team Sports", "Soccer"],
            aliases: ["soccer ball", "cleats"],
          },
          Football: {
            name: "Football",
            path: ["Sports & Outdoors", "Team Sports", "Football"],
            aliases: ["football", "nfl", "football gear"],
          },
          Basketball: {
            name: "Basketball",
            path: ["Sports & Outdoors", "Team Sports", "Basketball"],
            aliases: ["basketball", "nba ball"],
          },
          "Baseball & Softball": {
            name: "Baseball & Softball",
            path: ["Sports & Outdoors", "Team Sports", "Baseball & Softball"],
            aliases: ["baseball", "glove", "bat"],
          },
          Volleyball: {
            name: "Volleyball",
            path: ["Sports & Outdoors", "Team Sports", "Volleyball"],
            aliases: ["volleyball"],
          },
        },
      },

      "Water Sports": {
        name: "Water Sports",
        path: ["Sports & Outdoors", "Water Sports"],
        aliases: ["swim", "snorkel", "float", "paddleboard"],
        children: {
          "Swim Gear": {
            name: "Swim Gear",
            path: ["Sports & Outdoors", "Water Sports", "Swim Gear"],
            aliases: ["goggles", "snorkel", "swim fins"],
          },
          "Paddle Sports": {
            name: "Paddle Sports",
            path: ["Sports & Outdoors", "Water Sports", "Paddle Sports"],
            aliases: ["kayak paddle", "paddleboard"],
          },
        },
      },

      "Winter Sports": {
        name: "Winter Sports",
        path: ["Sports & Outdoors", "Winter Sports"],
        aliases: ["ski", "snowboard", "snow gear"],
        children: {
          Skiing: {
            name: "Skiing",
            path: ["Sports & Outdoors", "Winter Sports", "Skiing"],
            aliases: ["skis", "ski boots"],
          },
          Snowboarding: {
            name: "Snowboarding",
            path: ["Sports & Outdoors", "Winter Sports", "Snowboarding"],
            aliases: ["snowboard", "bindings"],
          },
          "Winter Gear": {
            name: "Winter Gear",
            path: ["Sports & Outdoors", "Winter Sports", "Winter Gear"],
            aliases: ["snow pants", "goggles", "winter gloves"],
          },
        },
      },

      "Other Sports": {
        name: "Other Sports",
        path: ["Sports & Outdoors", "Other Sports"],
        aliases: ["sports gear", "athletic equipment", "misc sports"],
      },
    },
  },
  Electronics: {
    name: "Electronics",
    path: ["Electronics"],
    aliases: ["tech", "device", "gadget"],
    children: {
      "Cell Phones & Smartphones": {
        name: "Cell Phones & Smartphones",
        path: ["Electronics", "Cell Phones & Smartphones"],
        aliases: ["iphone", "android", "smartphone", "cell phone", "mobile"],
        children: {
          iPhones: {
            name: "iPhones",
            path: ["Electronics", "Cell Phones & Smartphones", "iPhones"],
            aliases: ["iphone 11", "iphone 12", "iphone 13", "iphone x", "apple phone"],
          },
          "Android Phones": {
            name: "Android Phones",
            path: ["Electronics", "Cell Phones & Smartphones", "Android Phones"],
            aliases: ["samsung", "galaxy", "pixel", "android device"],
          },
        },
      },

      "Phone Accessories": {
        name: "Phone Accessories",
        path: ["Electronics", "Phone Accessories"],
        aliases: ["charger", "phone case", "usb c", "lightning cable"],
        children: {
          Cases: {
            name: "Cases",
            path: ["Electronics", "Phone Accessories", "Cases"],
            aliases: ["phone case", "otterbox", "clear case"],
          },
          "Chargers & Cables": {
            name: "Chargers & Cables",
            path: ["Electronics", "Phone Accessories", "Chargers & Cables"],
            aliases: ["charger", "charging cable", "usb c cable", "lightning cable", "wall charger"],
          },
          "Screen Protectors": {
            name: "Screen Protectors",
            path: ["Electronics", "Phone Accessories", "Screen Protectors"],
            aliases: ["tempered glass", "screen film"],
          },
        },
      },

      "Laptops & Computers": {
        name: "Laptops & Computers",
        path: ["Electronics", "Laptops & Computers"],
        aliases: ["macbook", "windows laptop", "pc", "notebook"],
        children: {
          Laptops: {
            name: "Laptops",
            path: ["Electronics", "Laptops & Computers", "Laptops"],
            aliases: ["macbook", "windows laptop", "chromebook"],
          },
          Desktops: {
            name: "Desktops",
            path: ["Electronics", "Laptops & Computers", "Desktops"],
            aliases: ["pc tower", "desktop computer"],
          },
          Monitors: {
            name: "Monitors",
            path: ["Electronics", "Laptops & Computers", "Monitors"],
            aliases: ["computer screen", "display"],
          },
          "Keyboards & Mice": {
            name: "Keyboards & Mice",
            path: ["Electronics", "Laptops & Computers", "Keyboards & Mice"],
            aliases: ["keyboard", "mouse", "gaming mouse", "mechanical keyboard"],
          },
        },
      },

      "Tablets & eReaders": {
        name: "Tablets & eReaders",
        path: ["Electronics", "Tablets & eReaders"],
        aliases: ["ipad", "kindle", "tablet", "fire tablet"],
        children: {
          iPads: {
            name: "iPads",
            path: ["Electronics", "Tablets & eReaders", "iPads"],
            aliases: ["ipad air", "ipad pro", "apple tablet"],
          },
          "Android Tablets": {
            name: "Android Tablets",
            path: ["Electronics", "Tablets & eReaders", "Android Tablets"],
            aliases: ["samsung tablet", "galaxy tab"],
          },
          eReaders: {
            name: "eReaders",
            path: ["Electronics", "Tablets & eReaders", "eReaders"],
            aliases: ["kindle", "paperwhite"],
          },
        },
      },

      "Cameras & Photography": {
        name: "Cameras & Photography",
        path: ["Electronics", "Cameras & Photography"],
        aliases: ["camera", "dslr", "point and shoot", "lens"],
        children: {
          "Digital Cameras": {
            name: "Digital Cameras",
            path: ["Electronics", "Cameras & Photography", "Digital Cameras"],
            aliases: ["canon", "nikon", "sony camera"],
          },
          Lenses: {
            name: "Lenses",
            path: ["Electronics", "Cameras & Photography", "Lenses"],
            aliases: ["camera lens", "50mm", "wide angle lens"],
          },
          "Action Cameras": {
            name: "Action Cameras",
            path: ["Electronics", "Cameras & Photography", "Action Cameras"],
            aliases: ["gopro", "action cam"],
          },
        },
      },

      Gaming: {
        name: "Gaming",
        path: ["Electronics", "Gaming"],
        aliases: ["video games", "console", "controller"],
        children: {
          Consoles: {
            name: "Consoles",
            path: ["Electronics", "Gaming", "Consoles"],
            aliases: ["ps5", "ps4", "playstation", "xbox", "nintendo switch"],
          },
          Games: {
            name: "Games",
            path: ["Electronics", "Gaming", "Games"],
            aliases: ["video game", "switch game", "playstation game"],
          },
          Controllers: {
            name: "Controllers",
            path: ["Electronics", "Gaming", "Controllers"],
            aliases: ["joycon", "ps5 controller", "xbox controller"],
          },
        },
      },

      Audio: {
        name: "Audio",
        path: ["Electronics", "Audio"],
        aliases: ["headphones", "bluetooth speaker", "earbuds"],
        children: {
          Headphones: {
            name: "Headphones",
            path: ["Electronics", "Audio", "Headphones"],
            aliases: ["over ear", "wired headphones"],
          },
          Earbuds: {
            name: "Earbuds",
            path: ["Electronics", "Audio", "Earbuds"],
            aliases: ["airpods", "wireless earbuds"],
          },
          Speakers: {
            name: "Speakers",
            path: ["Electronics", "Audio", "Speakers"],
            aliases: ["bluetooth speaker", "sound bar"],
          },
        },
      },

      Wearables: {
        name: "Wearables",
        path: ["Electronics", "Wearables"],
        aliases: ["smartwatch", "fitness tracker", "apple watch"],
        children: {
          Smartwatches: {
            name: "Smartwatches",
            path: ["Electronics", "Wearables", "Smartwatches"],
            aliases: ["apple watch", "galaxy watch"],
          },
          "Fitness Trackers": {
            name: "Fitness Trackers",
            path: ["Electronics", "Wearables", "Fitness Trackers"],
            aliases: ["fitbit", "step tracker"],
          },
        },
      },

      "Other Electronics": {
        name: "Other Electronics",
        path: ["Electronics", "Other Electronics"],
        aliases: ["misc electronics", "device", "tech"],
      },
    },
  },
  "Video Games": {
    name: "Video Games",
    path: ["Video Games"],
    aliases: ["video games", "video game", "gaming"],
    children: {
      "PlayStation Games": {
        name: "PlayStation Games",
        path: ["Video Games", "PlayStation Games"],
        aliases: ["ps5 game", "ps4 game", "playstation game", "ps5 disc", "ps4 disc", "ps5 digital", "ps4 digital"],
      },
      "Xbox Games": {
        name: "Xbox Games",
        path: ["Video Games", "Xbox Games"],
        aliases: ["xbox game", "xbox one game", "xbox series x game", "xbox disc", "xbox digital"],
      },
      "Nintendo Switch Games": {
        name: "Nintendo Switch Games",
        path: ["Video Games", "Nintendo Switch Games"],
        aliases: ["switch game", "nintendo switch game", "switch cartridge", "switch physical", "switch digital"],
      },
      "PC Games": {
        name: "PC Games",
        path: ["Video Games", "PC Games"],
        aliases: ["pc game", "steam code", "windows game", "pc disc"],
      },
      "Retro & Classic Games": {
        name: "Retro & Classic Games",
        path: ["Video Games", "Retro & Classic Games"],
        aliases: ["retro game", "nes game", "snes game", "n64 game", "gamecube game", "sega game", "ps2 game", "ps1 game"],
      },
      "Game Bundles": {
        name: "Game Bundles",
        path: ["Video Games", "Game Bundles"],
        aliases: ["game lot", "bundle", "collection", "bulk games"],
      },
      "Other Video Games": {
        name: "Other Video Games",
        path: ["Video Games", "Other Video Games"],
        aliases: ["game", "video game", "misc game"],
      },
    },
  },
  "Bags & Accessories": {
    name: "Bags & Accessories",
    path: ["Bags & Accessories"],
    aliases: ["bags", "accessories", "purse"],
    children: {
      Handbags: {
        name: "Handbags",
        path: ["Bags & Accessories", "Handbags"],
        aliases: ["handbag", "purse", "tote", "crossbody", "shoulder bag", "satchel", "hobo bag", "mini bag", "leather bag"],
        children: {
          Totes: {
            name: "Totes",
            path: ["Bags & Accessories", "Handbags", "Totes"],
            aliases: ["tote", "large tote", "shoppers tote"],
          },
          "Crossbody Bags": {
            name: "Crossbody Bags",
            path: ["Bags & Accessories", "Handbags", "Crossbody Bags"],
            aliases: ["crossbody", "cross body", "small crossbody"],
          },
          "Shoulder Bags": {
            name: "Shoulder Bags",
            path: ["Bags & Accessories", "Handbags", "Shoulder Bags"],
            aliases: ["shoulder bag", "shoulder purse"],
          },
          Satchels: {
            name: "Satchels",
            path: ["Bags & Accessories", "Handbags", "Satchels"],
            aliases: ["satchel bag"],
          },
          "Mini Bags": {
            name: "Mini Bags",
            path: ["Bags & Accessories", "Handbags", "Mini Bags"],
            aliases: ["mini bag", "micro bag"],
          },
        },
      },
      "Wallets & Cardholders": {
        name: "Wallets & Cardholders",
        path: ["Bags & Accessories", "Wallets & Cardholders"],
        aliases: ["wallet", "cardholder", "card case", "zip wallet"],
      },
      Backpacks: {
        name: "Backpacks",
        path: ["Bags & Accessories", "Backpacks"],
        aliases: ["backpack", "mini backpack", "travel backpack"],
      },
      Jewelry: {
        name: "Jewelry",
        path: ["Bags & Accessories", "Jewelry"],
        aliases: ["necklace", "bracelet", "ring", "earrings", "jewelry"],
        children: {
          Necklaces: {
            name: "Necklaces",
            path: ["Bags & Accessories", "Jewelry", "Necklaces"],
            aliases: ["necklace", "pendant", "chain"],
          },
          Earrings: {
            name: "Earrings",
            path: ["Bags & Accessories", "Jewelry", "Earrings"],
            aliases: ["earrings", "studs", "hoops"],
          },
          Bracelets: {
            name: "Bracelets",
            path: ["Bags & Accessories", "Jewelry", "Bracelets"],
            aliases: ["bracelet", "bangle"],
          },
          Rings: {
            name: "Rings",
            path: ["Bags & Accessories", "Jewelry", "Rings"],
            aliases: ["ring", "stacking ring"],
          },
        },
      },
      Sunglasses: {
        name: "Sunglasses",
        path: ["Bags & Accessories", "Sunglasses"],
        aliases: ["sunglasses", "shades", "aviators"],
      },
      Belts: {
        name: "Belts",
        path: ["Bags & Accessories", "Belts"],
        aliases: ["belt", "leather belt", "fashion belt"],
      },
      "Hats & Hair Accessories": {
        name: "Hats & Hair Accessories",
        path: ["Bags & Accessories", "Hats & Hair Accessories"],
        aliases: ["hat", "beanie", "hair clip", "headband"],
        children: {
          Hats: {
            name: "Hats",
            path: ["Bags & Accessories", "Hats & Hair Accessories", "Hats"],
            aliases: ["hat", "beanie", "cap"],
          },
          "Hair Accessories": {
            name: "Hair Accessories",
            path: ["Bags & Accessories", "Hats & Hair Accessories", "Hair Accessories"],
            aliases: ["hair clip", "scrunchie", "headband"],
          },
        },
      },
      "Scarves & Gloves": {
        name: "Scarves & Gloves",
        path: ["Bags & Accessories", "Scarves & Gloves"],
        aliases: ["scarf", "gloves", "winter accessories"],
      },
      "Keychains & Bag Charms": {
        name: "Keychains & Bag Charms",
        path: ["Bags & Accessories", "Keychains & Bag Charms"],
        aliases: ["keychain", "bag charm", "key holder"],
      },
      "Other Accessories": {
        name: "Other Accessories",
        path: ["Bags & Accessories", "Other Accessories"],
        aliases: ["accessory", "misc accessories"],
      },
    },
  },
  "Kids & Baby": {
    name: "Kids & Baby",
    path: ["Kids & Baby"],
    aliases: ["kids", "baby", "toddler", "infant"],
    children: {
      "Baby Clothing": {
        name: "Baby Clothing",
        path: ["Kids & Baby", "Baby Clothing"],
        aliases: ["baby clothes", "onesie", "infant clothing", "newborn outfit"],
        children: {
          "0-3 Months": {
            name: "0-3 Months",
            path: ["Kids & Baby", "Baby Clothing", "0-3 Months"],
            aliases: ["0-3 months", "nb", "newborn", "infant 0-3"],
          },
          "3-6 Months": {
            name: "3-6 Months",
            path: ["Kids & Baby", "Baby Clothing", "3-6 Months"],
            aliases: ["3-6 months", "infant 3-6"],
          },
          "6-12 Months": {
            name: "6-12 Months",
            path: ["Kids & Baby", "Baby Clothing", "6-12 Months"],
            aliases: ["6-12 months", "infant 6-12"],
          },
          "12M+": {
            name: "12M+",
            path: ["Kids & Baby", "Baby Clothing", "12M+"],
            aliases: ["12m", "18m", "24m", "2t"],
          },
        },
      },
      "Kids Clothing": {
        name: "Kids Clothing",
        path: ["Kids & Baby", "Kids Clothing"],
        aliases: ["kids outfit", "toddler clothes", "boys clothes", "girls clothes"],
        children: {
          Girls: {
            name: "Girls",
            path: ["Kids & Baby", "Kids Clothing", "Girls"],
            aliases: ["girls top", "girls dress"],
          },
          Boys: {
            name: "Boys",
            path: ["Kids & Baby", "Kids Clothing", "Boys"],
            aliases: ["boys shirt", "boys shorts"],
          },
          Unisex: {
            name: "Unisex",
            path: ["Kids & Baby", "Kids Clothing", "Unisex"],
            aliases: ["unisex kids", "gender neutral"],
          },
        },
      },
      Shoes: {
        name: "Shoes",
        path: ["Kids & Baby", "Shoes"],
        aliases: ["kids shoes", "toddler shoes", "baby shoes"],
        children: {
          "Baby Shoes": {
            name: "Baby Shoes",
            path: ["Kids & Baby", "Shoes", "Baby Shoes"],
            aliases: ["crib shoes", "infant shoes"],
          },
          "Kids Shoes": {
            name: "Kids Shoes",
            path: ["Kids & Baby", "Shoes", "Kids Shoes"],
            aliases: ["youth shoes", "toddler shoes"],
          },
        },
      },
      "Baby Gear": {
        name: "Baby Gear",
        path: ["Kids & Baby", "Baby Gear"],
        aliases: ["stroller", "car seat", "carrier", "bouncer", "swing"],
        children: {
          Strollers: {
            name: "Strollers",
            path: ["Kids & Baby", "Baby Gear", "Strollers"],
            aliases: ["stroller", "travel system"],
          },
          "Car Seats": {
            name: "Car Seats",
            path: ["Kids & Baby", "Baby Gear", "Car Seats"],
            aliases: ["infant car seat", "booster seat"],
          },
          "Baby Carriers": {
            name: "Baby Carriers",
            path: ["Kids & Baby", "Baby Gear", "Baby Carriers"],
            aliases: ["carrier", "wrap", "baby sling"],
          },
          "Swings & Bouncers": {
            name: "Swings & Bouncers",
            path: ["Kids & Baby", "Baby Gear", "Swings & Bouncers"],
            aliases: ["bouncer", "baby swing"],
          },
        },
      },
      "Kids Toys": {
        name: "Kids Toys",
        path: ["Kids & Baby", "Kids Toys"],
        aliases: ["kids toys", "toddler toys", "baby toys"],
        children: {
          "Learning Toys": {
            name: "Learning Toys",
            path: ["Kids & Baby", "Kids Toys", "Learning Toys"],
            aliases: ["educational toy", "learning toy"],
          },
          "Plush & Soft Toys": {
            name: "Plush & Soft Toys",
            path: ["Kids & Baby", "Kids Toys", "Plush & Soft Toys"],
            aliases: ["plush toy", "stuffed animal"],
          },
          "Action & Playsets": {
            name: "Action & Playsets",
            path: ["Kids & Baby", "Kids Toys", "Action & Playsets"],
            aliases: ["playset", "kids figures"],
          },
        },
      },
      "Nursery & Feeding": {
        name: "Nursery & Feeding",
        path: ["Kids & Baby", "Nursery & Feeding"],
        aliases: ["bottle", "high chair", "changing pad", "nursery decor"],
        children: {
          Feeding: {
            name: "Feeding",
            path: ["Kids & Baby", "Nursery & Feeding", "Feeding"],
            aliases: ["bottle", "sippy cup", "feeding set"],
          },
          "Nursery Decor": {
            name: "Nursery Decor",
            path: ["Kids & Baby", "Nursery & Feeding", "Nursery Decor"],
            aliases: ["nursery decor", "baby room decor"],
          },
        },
      },
      Diapering: {
        name: "Diapering",
        path: ["Kids & Baby", "Diapering"],
        aliases: ["diapers", "diaper bag", "wipes"],
      },
      "Other Kids & Baby": {
        name: "Other Kids & Baby",
        path: ["Kids & Baby", "Other Kids & Baby"],
        aliases: ["kids item", "baby item", "misc kids"],
      },
    },
  },
  Home: {
    name: "Home",
    path: ["Home"],
    aliases: ["house", "home goods", "decor"],
    children: {},
  },
  Beauty: {
    name: "Beauty",
    path: ["Beauty"],
    aliases: ["makeup", "cosmetics", "skincare"],
    children: {
      Makeup: {
        name: "Makeup",
        path: ["Beauty", "Makeup"],
        aliases: [
          "lipstick",
          "mascara",
          "foundation",
          "highlighter",
          "blush",
          "bronzer",
          "concealer",
          "makeup palette",
          "eyeshadow",
          "makeup set",
          "tint",
          "liquid lipstick",
          "gloss",
        ],
        children: {
          Face: {
            name: "Face",
            path: ["Beauty", "Makeup", "Face"],
            aliases: ["foundation", "concealer", "powder", "blush", "bronzer", "highlighter"],
          },
          Eyes: {
            name: "Eyes",
            path: ["Beauty", "Makeup", "Eyes"],
            aliases: ["eyeshadow", "palette", "mascara", "eyeliner"],
          },
          Lips: {
            name: "Lips",
            path: ["Beauty", "Makeup", "Lips"],
            aliases: ["lipstick", "lip gloss", "lip oil", "lip balm"],
          },
          "Makeup Palettes": {
            name: "Makeup Palettes",
            path: ["Beauty", "Makeup", "Makeup Palettes"],
            aliases: ["eyeshadow palette", "face palette", "highlighter palette"],
          },
          "Makeup Tools": {
            name: "Makeup Tools",
            path: ["Beauty", "Makeup", "Makeup Tools"],
            aliases: ["brush", "beauty blender", "sponge", "makeup tool"],
          },
        },
      },

      Skincare: {
        name: "Skincare",
        path: ["Beauty", "Skincare"],
        aliases: [
          "moisturizer",
          "serum",
          "cleanser",
          "toner",
          "exfoliant",
          "face mask",
          "sheet mask",
          "retinol",
          "k beauty",
          "j beauty",
        ],
        children: {
          Moisturizers: {
            name: "Moisturizers",
            path: ["Beauty", "Skincare", "Moisturizers"],
            aliases: ["cream", "gel cream", "hydrator"],
          },
          Cleansers: {
            name: "Cleansers",
            path: ["Beauty", "Skincare", "Cleansers"],
            aliases: ["cleanser", "face wash", "foam cleanser"],
          },
          "Serums & Treatments": {
            name: "Serums & Treatments",
            path: ["Beauty", "Skincare", "Serums & Treatments"],
            aliases: ["serum", "retinol", "treatment", "essence"],
          },
          Masks: {
            name: "Masks",
            path: ["Beauty", "Skincare", "Masks"],
            aliases: ["sheet mask", "clay mask"],
          },
        },
      },

      "Hair Care & Styling": {
        name: "Hair Care & Styling",
        path: ["Beauty", "Hair Care & Styling"],
        aliases: ["shampoo", "conditioner", "hair mask", "hair oil", "styling gel"],
        children: {
          "Shampoo & Conditioner": {
            name: "Shampoo & Conditioner",
            path: ["Beauty", "Hair Care & Styling", "Shampoo & Conditioner"],
            aliases: ["shampoo", "conditioner", "set"],
          },
          "Hair Styling": {
            name: "Hair Styling",
            path: ["Beauty", "Hair Care & Styling", "Hair Styling"],
            aliases: ["hair spray", "gel", "mousse", "styling cream"],
          },
          "Hair Treatments": {
            name: "Hair Treatments",
            path: ["Beauty", "Hair Care & Styling", "Hair Treatments"],
            aliases: ["hair mask", "hair oil", "keratin treatment"],
          },
        },
      },

      "Hair Tools": {
        name: "Hair Tools",
        path: ["Beauty", "Hair Tools"],
        aliases: ["curling iron", "hair dryer", "straightener", "flat iron"],
        children: {
          "Curling Irons": {
            name: "Curling Irons",
            path: ["Beauty", "Hair Tools", "Curling Irons"],
            aliases: ["curling wand"],
          },
          Straighteners: {
            name: "Straighteners",
            path: ["Beauty", "Hair Tools", "Straighteners"],
            aliases: ["flat iron", "hair straightener"],
          },
          "Hair Dryers": {
            name: "Hair Dryers",
            path: ["Beauty", "Hair Tools", "Hair Dryers"],
            aliases: ["blow dryer"],
          },
        },
      },

      Fragrance: {
        name: "Fragrance",
        path: ["Beauty", "Fragrance"],
        aliases: ["perfume", "eau de parfum", "body spray", "cologne"],
        children: {
          Perfume: {
            name: "Perfume",
            path: ["Beauty", "Fragrance", "Perfume"],
            aliases: ["eau de parfum", "edp", "eau de toilette", "edt"],
          },
          "Body Sprays": {
            name: "Body Sprays",
            path: ["Beauty", "Fragrance", "Body Sprays"],
            aliases: ["body spray", "mist", "bath and body works mist"],
          },
        },
      },

      "Bath & Body": {
        name: "Bath & Body",
        path: ["Beauty", "Bath & Body"],
        aliases: ["body lotion", "body wash", "scrub", "bath bomb"],
        children: {
          "Body Wash": {
            name: "Body Wash",
            path: ["Beauty", "Bath & Body", "Body Wash"],
            aliases: ["shower gel", "body wash"],
          },
          "Body Lotion": {
            name: "Body Lotion",
            path: ["Beauty", "Bath & Body", "Body Lotion"],
            aliases: ["body cream", "moisturizing lotion"],
          },
          "Body Scrubs": {
            name: "Body Scrubs",
            path: ["Beauty", "Bath & Body", "Body Scrubs"],
            aliases: ["scrub", "exfoliating scrub"],
          },
        },
      },

      "Nail Care": {
        name: "Nail Care",
        path: ["Beauty", "Nail Care"],
        aliases: ["nail polish", "press on nails", "nail tools"],
        children: {
          Polish: {
            name: "Polish",
            path: ["Beauty", "Nail Care", "Polish"],
            aliases: ["nail polish", "gel polish"],
          },
          "Press-On Nails": {
            name: "Press-On Nails",
            path: ["Beauty", "Nail Care", "Press-On Nails"],
            aliases: ["press on", "fake nails"],
          },
          "Nail Tools": {
            name: "Nail Tools",
            path: ["Beauty", "Nail Care", "Nail Tools"],
            aliases: ["nail file", "nail clipper"],
          },
        },
      },

      "Men's Grooming": {
        name: "Men's Grooming",
        path: ["Beauty", "Men's Grooming"],
        aliases: ["beard oil", "shaving cream", "aftershave", "trimmer"],
        children: {
          Shaving: {
            name: "Shaving",
            path: ["Beauty", "Men's Grooming", "Shaving"],
            aliases: ["razor", "shaving cream"],
          },
          "Beard Care": {
            name: "Beard Care",
            path: ["Beauty", "Men's Grooming", "Beard Care"],
            aliases: ["beard oil", "beard balm"],
          },
          Trimmers: {
            name: "Trimmers",
            path: ["Beauty", "Men's Grooming", "Trimmers"],
            aliases: ["trimmer", "clippers"],
          },
        },
      },

      "Beauty Bundles": {
        name: "Beauty Bundles",
        path: ["Beauty", "Beauty Bundles"],
        aliases: ["bundle", "mixed set", "makeup lot", "beauty lot"],
      },

      "Other Beauty": {
        name: "Other Beauty",
        path: ["Beauty", "Other Beauty"],
        aliases: ["beauty item", "misc beauty"],
      },
    },
  },
  Toys: {
    name: "Toys",
    path: ["Toys"],
    aliases: ["toy", "play", "action figure"],
    children: {},
  },
  Collectibles: {
    name: "Collectibles",
    path: ["Collectibles"],
    aliases: ["collectible", "figure", "trading card", "vintage"],
    children: {
      "Funko & Figures": {
        name: "Funko & Figures",
        path: ["Collectibles", "Funko & Figures"],
        aliases: ["funko", "funko pop", "vinyl figure", "collector figure", "limited edition funko"],
        children: {
          "Funko Pop": {
            name: "Funko Pop",
            path: ["Collectibles", "Funko & Figures", "Funko Pop"],
            aliases: ["funko", "pop", "pop vinyl"],
          },
          "Collector Figures": {
            name: "Collector Figures",
            path: ["Collectibles", "Funko & Figures", "Collector Figures"],
            aliases: ["collector figure", "vinyl figure", "statue", "mini figure"],
          },
        },
      },
      "Comics & Manga": {
        name: "Comics & Manga",
        path: ["Collectibles", "Comics & Manga"],
        aliases: ["comic book", "graphic novel", "manga"],
        children: {
          "Comic Books": {
            name: "Comic Books",
            path: ["Collectibles", "Comics & Manga", "Comic Books"],
            aliases: ["comic", "marvel comic", "dc comic"],
          },
          Manga: {
            name: "Manga",
            path: ["Collectibles", "Comics & Manga", "Manga"],
            aliases: ["manga book", "anime manga"],
          },
        },
      },
      "Coins & Currency": {
        name: "Coins & Currency",
        path: ["Collectibles", "Coins & Currency"],
        aliases: ["coin", "silver coin", "currency", "paper money"],
        children: {
          Coins: {
            name: "Coins",
            path: ["Collectibles", "Coins & Currency", "Coins"],
            aliases: ["coin", "silver coin", "penny", "nickel", "rare coin"],
          },
          "Paper Money": {
            name: "Paper Money",
            path: ["Collectibles", "Coins & Currency", "Paper Money"],
            aliases: ["bill", "banknote"],
          },
        },
      },
      Stamps: {
        name: "Stamps",
        path: ["Collectibles", "Stamps"],
        aliases: ["stamp", "stamp collection", "vintage stamp"],
      },
      "Trading Pins": {
        name: "Trading Pins",
        path: ["Collectibles", "Trading Pins"],
        aliases: ["pin", "trading pin", "disney pin", "collector pin"],
      },
      Autographs: {
        name: "Autographs",
        path: ["Collectibles", "Autographs"],
        aliases: ["autograph", "signed", "signed photo", "signature"],
      },
      "Vintage Memorabilia": {
        name: "Vintage Memorabilia",
        path: ["Collectibles", "Vintage Memorabilia"],
        aliases: ["vintage", "memorabilia", "retro", "collectible item", "souvenir", "classic collectible"],
      },
      "Sports Memorabilia": {
        name: "Sports Memorabilia",
        path: ["Collectibles", "Sports Memorabilia"],
        aliases: ["sports memorabilia", "signed jersey", "trading card memorabilia"],
      },
      "Posters & Prints": {
        name: "Posters & Prints",
        path: ["Collectibles", "Posters & Prints"],
        aliases: ["poster", "print", "art print", "collector poster"],
      },
      "Music & Media Collectibles": {
        name: "Music & Media Collectibles",
        path: ["Collectibles", "Music & Media Collectibles"],
        aliases: ["vinyl", "cd", "cassette", "record"],
        children: {
          Vinyl: {
            name: "Vinyl",
            path: ["Collectibles", "Music & Media Collectibles", "Vinyl"],
            aliases: ["vinyl record", "lp"],
          },
          CDs: {
            name: "CDs",
            path: ["Collectibles", "Music & Media Collectibles", "CDs"],
            aliases: ["cd", "album cd"],
          },
          Cassettes: {
            name: "Cassettes",
            path: ["Collectibles", "Music & Media Collectibles", "Cassettes"],
            aliases: ["cassette", "tape"],
          },
        },
      },
      "Other Collectibles": {
        name: "Other Collectibles",
        path: ["Collectibles", "Other Collectibles"],
        aliases: ["collectible", "collector item", "misc collectible"],
      },
    },
  },
};

// -------------------------------------------------------------
// HELPER: Flatten the entire taxonomy into a searchable list
// -------------------------------------------------------------
export function flattenCategories(tree = mercariCategories) {
  const results = [];

  function walk(node) {
    if (!node) return;

    if (node.name && node.path) {
      results.push(node);
    }

    if (node.children) {
      Object.values(node.children).forEach((child) => walk(child));
    }
  }

  Object.values(tree).forEach((root) => walk(root));

  return results;
}

// -------------------------------------------------------------
// HELPER: Keyword match score based on names + aliases
// -------------------------------------------------------------
export function scoreCategoryMatch(category, text) {
  if (!category || !text) return 0;

  const normalized = text.toLowerCase();
  let score = 0;

  if (normalized.includes(category.name.toLowerCase())) {
    score += 5;
  }

  if (Array.isArray(category.aliases)) {
    category.aliases.forEach((alias) => {
      if (normalized.includes(alias.toLowerCase())) {
        score += 3;
      }
    });
  }

  category.path.forEach((segment) => {
    if (normalized.includes(segment.toLowerCase())) {
      score += 2;
    }
  });

  return score;
}

// -------------------------------------------------------------
// HELPER: Find best match for category detection
// -------------------------------------------------------------
export function detectBestCategory(listingData, flattened = null) {
  if (!listingData) return null;

  const text = `${listingData.title || ""} ${listingData.description || ""}`.toLowerCase();
  const all = flattened || flattenCategories();

  let best = null;
  let bestScore = 0;

  all.forEach((cat) => {
    const s = scoreCategoryMatch(cat, text);
    if (s > bestScore) {
      bestScore = s;
      best = cat;
    }
  });

  return best;
}

// -------------------------------------------------------------
// EXPORT EVERYTHING
// -------------------------------------------------------------
export default {
  mercariCategories,
  flattenCategories,
  detectBestCategory,
  scoreCategoryMatch,
};
