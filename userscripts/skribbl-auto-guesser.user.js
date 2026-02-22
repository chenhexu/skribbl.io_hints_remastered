// ==UserScript==
// @name         Skribbl.io Auto Guesser + Hint Parser
// @namespace    https://github.com/openai/codex
// @version      1.0.0
// @description  Parses skribbl hints, derives candidate words with app-compatible matching logic, and can auto-send guesses with delay + close-hit retry support.
// @match        https://skribbl.io/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const STORAGE_KEY = 'skribblAutoGuesserSettings_v1';
  const WORD_CACHE_KEY = 'skribblAutoGuesserWordCache_v1';
  const DEFAULT_SETTINGS = {
    delayMs: 1000,
    dotPrefix: true,
    panelX: null,
    panelY: null,
    collapsed: false,
    corner: 'top-right',
  };

  const LIMITS = {
    delayMin: 0,
    delayMax: 8000,
    candidatePreview: 12,
    maxRetries: 5,
    queueBurstLimit: 1200,
    spamCooldownMs: 1200,
    tickPollMs: 150,
  };

  const BUNDLED_WORDS = ["ABBA", "AC/DC", "Abraham Lincoln", "Adidas", "Africa", "Aladdin", "America", "Amsterdam", "Android", "Angelina Jolie", "Angry Birds", "Antarctica", "Anubis", "Apple", "Argentina", "Asia", "Asterix", "Atlantis", "Audi", "Australia", "BMW", "BMX", "Bambi", "Band-Aid", "Barack Obama", "Bart Simpson", "Batman", "Beethoven", "Bible", "Big Ben", "Bill Gates", "Bitcoin", "Black Friday", "Bomberman", "Brazil", "Bruce Lee", "Bugs Bunny", "Canada", "Capricorn", "Captain America", "Cat Woman", "Cerberus", "Charlie Chaplin", "Chewbacca", "China", "Chinatown", "Christmas", "Chrome", "Chuck Norris", "Colosseum", "Cookie Monster", "Crash Bandicoot", "Creeper", "Croatia", "Cuba", "Cupid", "DNA", "Daffy Duck", "Darwin", "Darwin Watterson", "Deadpool", "Dexter", "Discord", "Donald Duck", "Donald Trump", "Dora", "Doritos", "Dracula", "Dumbo", "Earth", "Easter", "Easter Bunny", "Egypt", "Eiffel tower", "Einstein", "Elmo", "Elon Musk", "Elsa", "Eminem", "England", "Europe", "Excalibur", "Facebook", "Family Guy", "Fanta", "Ferrari", "Finn", "Finn and Jake", "Flash", "Florida", "France", "Frankenstein", "Fred Flintstone", "Gandalf", "Gandhi", "Garfield", "Germany", "God", "Goofy", "Google", "Great Wall", "Greece", "Green Lantern", "Grinch", "Gru", "Gumball", "Happy Meal", "Harry Potter", "Hawaii", "Hello Kitty", "Hercules", "Hollywood", "Home Alone", "Homer Simpson", "Hula Hoop", "Hulk", "Ikea", "India", "Intel", "Ireland", "Iron Giant", "Iron Man", "Israel", "Italy", "Jack-o-lantern", "Jackie Chan", "James Bond", "Japan", "JayZ", "Jenga", "Jesus Christ", "Jimmy Neutron", "John Cena", "Johnny Bravo", "KFC", "Katy Perry", "Kermit", "Kim Jong-un", "King Kong", "Kirby", "Kung Fu", "Lady Gaga", "Las Vegas", "Lasagna", "Lego", "Leonardo DiCaprio", "Leonardo da Vinci", "Lion King", "London", "London Eye", "Luigi", "MTV", "Madagascar", "Mario", "Mark Zuckerberg", "Mars", "McDonalds", "Medusa", "Mercedes", "Mercury", "Mexico", "Michael Jackson", "Mickey Mouse", "Microsoft", "Milky Way", "Minecraft", "Miniclip", "Minion", "Minotaur", "Mona Lisa", "Monday", "Monster", "Mont Blanc", "Morgan Freeman", "Morse code", "Morty", "Mount Everest", "Mount Rushmore", "Mozart", "Mr Bean", "Mr Meeseeks", "Mr. Bean", "Mr. Meeseeks", "Mummy", "NASCAR", "Nasa", "Nemo", "Neptune", "Netherlands", "New Zealand", "Nike", "Nintendo Switch", "North Korea", "Northern Lights", "Norway", "Notch", "Nutella", "Obelix", "Olaf", "Oreo", "Pac-Man", "Paris", "Patrick", "Paypal", "Peppa Pig", "Pepsi", "Phineas and Ferb", "Photoshop", "Picasso", "Pikachu", "Pink Panther", "Pinocchio", "Playstation", "Pluto", "Pokemon", "Popeye", "Popsicle", "Porky Pig", "Portugal", "Poseidon", "Pringles", "Pumba", "Reddit", "Rick", "Robbie Rotten", "Robin Hood", "Romania", "Rome", "Russia", "Samsung", "Santa", "Saturn", "Scooby Doo", "Scotland", "Segway", "Sherlock Holmes", "Shrek", "Singapore", "Skittles", "Skrillex", "Skype", "Slinky", "Solar System", "Sonic", "Spain", "Spartacus", "Spiderman", "SpongeBob", "Squidward", "Star Wars", "Statue of Liberty", "Steam", "Stegosaurus", "Steve Jobs", "Stone Age", "Sudoku", "Suez Canal", "Superman", "Susan Wojcicki", "Sydney Opera House", "T-rex", "Tails", "Tarzan", "Teletubby", "Terminator", "Tetris", "The Beatles", "Thor", "Titanic", "Tooth Fairy", "Tower Bridge", "Tower of Pisa", "Tweety", "Twitter", "UFO", "USB", "Uranus", "Usain Bolt", "Vatican", "Vault boy", "Velociraptor", "Venus", "Vin Diesel", "W-LAN", "Wall-e", "WhatsApp", "William Shakespeare", "William Wallace", "Winnie the Pooh", "Wolverine", "Wonder Woman", "Xbox", "Xerox", "Yin and Yang", "Yoda", "Yoshi", "Youtube", "Zelda", "Zeus", "Zorro", "Zuma", "abstract", "abyss", "accident", "accordion", "ace", "acid", "acne", "acorn", "action", "actor", "addiction", "addition", "adorable", "adult", "advertisement", "afro", "afterlife", "air conditioner", "airbag", "aircraft", "airplane", "airport", "alarm", "albatross", "alcohol", "alien", "allergy", "alley", "alligator", "almond", "alpaca", "ambulance", "anaconda", "anchor", "angel", "anglerfish", "angry", "animation", "anime", "ant", "anteater", "antelope", "antenna", "anthill", "antivirus", "anvil", "apartment", "apocalypse", "applause", "apple", "apple pie", "apple seed", "apricot", "aquarium", "arch", "archaeologist", "archer", "architect", "aristocrat", "arm", "armadillo", "armor", "armpit", "arrow", "ash", "assassin", "assault", "asteroid", "astronaut", "asymmetry", "athlete", "atom", "attic", "audience", "autograph", "avocado", "axe", "baboon", "baby", "back pain", "backbone", "backflip", "backpack", "bacon", "bad", "badger", "bag", "bagel", "bagpipes", "baguette", "bait", "bakery", "baklava", "balance", "balcony", "bald", "ball", "ballerina", "ballet", "balloon", "bamboo", "banana", "bandage", "bandana", "banjo", "bank", "banker", "bar", "barbarian", "barbecue", "barbed wire", "barber", "barcode", "bark", "barn", "barrel", "bartender", "base", "basement", "basket", "basketball", "bat", "bathroom", "bathtub", "battery", "battle", "battleship", "bayonet", "bazooka", "beach", "beak", "bean", "bean bag", "beanie", "beanstalk", "bear", "bear trap", "beatbox", "beaver", "bed", "bed bug", "bed sheet", "bedtime", "bee", "beef", "beer", "beet", "beetle", "bell", "bell pepper", "bellow", "belly", "belly button", "below", "belt", "bench", "betray", "bicycle", "bill", "billiards", "bingo", "binoculars", "biology", "birch", "bird", "bird bath", "birthday", "biscuit", "bite", "black", "black hole", "blackberry", "blacksmith", "blanket", "bleach", "blender", "blimp", "blind", "blindfold", "blizzard", "blood", "blowfish", "blue", "blueberry", "blush", "boar", "board", "boat", "bobsled", "bodyguard", "boil", "bomb", "booger", "book", "bookmark", "bookshelf", "boomerang", "boots", "border", "bottle", "bottle flip", "bounce", "bouncer", "bow", "bowl", "bowling", "box", "boy", "bracelet", "braces", "brain", "brainwash", "branch", "brand", "bread", "breakfast", "breath", "brick", "bricklayer", "bride", "bridge", "broadcast", "broccoli", "broken heart", "bronze", "broom", "broomstick", "brownie", "bruise", "brunette", "brush", "bubble", "bubble gum", "bucket", "building", "bulge", "bull", "bulldozer", "bullet", "bumper", "bungee jumping", "bunk bed", "bunny", "burglar", "burp", "burrito", "bus", "bus driver", "bus stop", "butcher", "butler", "butt cheeks", "butter", "butterfly", "button", "cab driver", "cabin", "cabinet", "cactus", "cage", "cake", "calendar", "camel", "camera", "campfire", "camping", "can", "can opener", "canary", "candle", "canister", "cannon", "canyon", "cap", "cape", "cappuccino", "captain", "car wash", "cardboard", "carnival", "carnivore", "carpenter", "carpet", "carrot", "cartoon", "cash", "casino", "cast", "cat", "catalog", "catapult", "caterpillar", "catfish", "cathedral", "cauldron", "cauliflower", "cave", "caveman", "caviar", "ceiling", "ceiling fan", "celebrate", "celebrity", "cell", "cell phone", "cello", "cement", "centaur", "centipede", "chain", "chainsaw", "chair", "chalk", "chameleon", "champagne", "champion", "chandelier", "charger", "cheek", "cheeks", "cheerleader", "cheese", "cheeseburger", "cheesecake", "cheetah", "chef", "chemical", "cherry", "cherry blossom", "chess", "chest", "chest hair", "chestnut", "chestplate", "chew", "chicken", "chihuahua", "child", "chime", "chimney", "chimpanzee", "chin", "chinchilla", "chocolate", "chopsticks", "church", "cicada", "cigarette", "cinema", "circle", "circus", "clap", "clarinet", "classroom", "claw", "clay", "clean", "clickbait", "cliff", "climb", "cloak", "clock", "cloth", "clothes hanger", "cloud", "clover", "clown", "clownfish", "coach", "coal", "coast", "coast guard", "coaster", "coat", "cobra", "cockroach", "cocktail", "coconut", "cocoon", "coffee", "coffee shop", "coffin", "coin", "cola", "cold", "collapse", "collar", "color-blind", "comb", "comedian", "comedy", "comet", "comfortable", "comic book", "commander", "commercial", "communism", "community", "compass", "complete", "computer", "concert", "condiment", "cone", "confused", "console", "continent", "controller", "conversation", "cookie", "cookie jar", "copper", "copy", "coral", "coral reef", "cord", "cork", "corkscrew", "corn", "corn dog", "corner", "cornfield", "corpse", "cotton", "cotton candy", "country", "cousin", "cow", "cowbell", "cowboy", "coyote", "crab", "crack", "crate", "crawl space", "crayon", "cream", "credit", "credit card", "cricket", "cringe", "crocodile", "croissant", "crossbow", "crow", "crowbar", "crucible", "cruise", "crust", "crystal", "cube", "cuckoo", "cucumber", "cup", "cupboard", "cupcake", "curry", "curtain", "cushion", "customer", "cut", "cute", "cyborg", "cylinder", "cymbal", "dagger", "daisy", "dalmatian", "dance", "dandelion", "dandruff", "darts", "dashboard", "daughter", "day", "dead", "deaf", "deep", "deer", "defense", "delivery", "demon", "demonstration", "dent", "dentist", "deodorant", "depressed", "derp", "desert", "desk", "desperate", "dessert", "detective", "detonate", "dew", "diagonal", "diagram", "diamond", "diaper", "dice", "dictionary", "die", "diet", "dig", "dinner", "dinosaur", "diploma", "dirty", "disaster", "disease", "dishrag", "dispenser", "display", "diss track", "distance", "diva", "divorce", "dizzy", "dock", "doctor", "dog", "doghouse", "doll", "dollar", "dollhouse", "dolphin", "dome", "dominoes", "donkey", "door", "doorknob", "dots", "double", "dough", "download", "dragon", "dragonfly", "drain", "drama", "drawer", "dream", "dress", "drink", "drip", "drive", "driver", "drool", "droplet", "drought", "drum", "drum kit", "duck", "duct tape", "duel", "dwarf", "dynamite", "eagle", "ear", "earbuds", "earthquake", "earwax", "east", "eat", "echo", "eclipse", "eel", "egg", "eggplant", "elbow", "elder", "election", "electric car", "electric guitar", "electrician", "electricity", "elephant", "elevator", "embers", "emerald", "emoji", "employer", "emu", "end", "engine", "engineer", "equator", "eraser", "error", "eskimo", "espresso", "evaporate", "evening", "evolution", "exam", "excavator", "exercise", "explosion", "eye", "eyebrow", "eyelash", "eyeshadow", "fabric", "fabulous", "facade", "face", "face paint", "factory", "failure", "fairy", "fake teeth", "fall", "family", "farm", "farmer", "fashion designer", "fast", "fast food", "fast forward", "father", "faucet", "feather", "fence", "fencing", "fern", "festival", "fidget spinner", "field", "figurine", "filmmaker", "filter", "finger", "fingernail", "fingertip", "fire alarm", "fire hydrant", "fire truck", "fireball", "firecracker", "firefighter", "firefly", "firehouse", "fireman", "fireplace", "fireproof", "fireside", "firework", "fish", "fish bowl", "fisherman", "fist fight", "fitness trainer", "fizz", "flag", "flagpole", "flamethrower", "flamingo", "flashlight", "flask", "flea", "flight attendant", "flock", "floodlight", "floppy disk", "florist", "flower", "flu", "fluid", "flush", "flute", "fly", "fly swatter", "flying pig", "fog", "foil", "folder", "food", "forehead", "forest", "forest fire", "fork", "fort", "fortress", "fortune", "fossil", "fountain", "fox", "frame", "freckles", "freezer", "fridge", "fries", "frog", "frostbite", "frosting", "frown", "fruit", "full", "full moon", "funeral", "funny", "fur", "furniture", "galaxy", "gang", "gangster", "garage", "garbage", "garden", "gardener", "garlic", "gas", "gas mask", "gasoline", "gasp", "gate", "gem", "gender", "generator", "genie", "gentle", "gentleman", "geography", "germ", "geyser", "ghost", "giant", "gift", "giraffe", "girl", "gladiator", "glass", "glasses", "glitter", "globe", "gloss", "glove", "glow", "glowstick", "glue", "glue stick", "gnome", "goal", "goat", "goatee", "goblin", "godfather", "gold", "gold chain", "golden apple", "golden egg", "goldfish", "golf", "golf cart", "good", "goose", "gorilla", "graduation", "graffiti", "grandmother", "grapefruit", "grapes", "graph", "grass", "grasshopper", "grave", "gravedigger", "gravel", "graveyard", "gravity", "greed", "grenade", "grid", "grill", "grin", "groom", "grumpy", "guillotine", "guinea pig", "guitar", "gumball", "gummy", "gummy bear", "gummy worm", "hacker", "hair", "hair roller", "hairbrush", "haircut", "hairspray", "hairy", "half", "halo", "ham", "hamburger", "hammer", "hammock", "hamster", "hand", "handicap", "handle", "handshake", "hanger", "happy", "harbor", "hard", "hard hat", "harmonica", "harp", "harpoon", "hashtag", "hat", "hazard", "hazelnut", "head", "headache", "headband", "headboard", "heading", "headphones", "health", "heart", "heat", "hedgehog", "heel", "heist", "helicopter", "hell", "helmet", "hen", "hermit", "hero", "hexagon", "hibernate", "hieroglyph", "high five", "high heels", "high score", "highway", "hilarious", "hill", "hip hop", "hippie", "hippo", "hitchhiker", "hive", "hobbit", "hockey", "holiday", "homeless", "honey", "honeycomb", "hoof", "hook", "hop", "hopscotch", "horizon", "horn", "horse", "horsewhip", "hose", "hospital", "hot", "hot chocolate", "hot dog", "hot sauce", "hotel", "hourglass", "house", "hovercraft", "hug", "hummingbird", "hunger", "hunter", "hurdle", "hurt", "husband", "hut", "hyena", "hypnotize", "iPad", "iPhone", "ice", "ice cream", "ice cream truck", "iceberg", "icicle", "idea", "imagination", "impact", "incognito", "industry", "infinite", "injection", "insect", "inside", "insomnia", "internet", "intersection", "interview", "invasion", "invention", "invisible", "iron", "island", "ivy", "jacket", "jackhammer", "jaguar", "jail", "jalapeno", "janitor", "jaw", "jazz", "jeans", "jeep", "jello", "jelly", "jellyfish", "jester", "jet ski", "joker", "journalist", "journey", "judge", "juggle", "juice", "jump rope", "jungle", "junk food", "kangaroo", "karaoke", "karate", "katana", "kazoo", "kebab", "keg", "kendama", "ketchup", "kettle", "key", "keyboard", "kidney", "kindergarten", "king", "kiss", "kitchen", "kite", "kitten", "kiwi", "knee", "kneel", "knife", "knight", "knot", "knuckle", "koala", "kraken", "label", "laboratory", "ladder", "lady", "ladybug", "lake", "lamb", "lamp", "landlord", "landscape", "lane", "language", "lantern", "lap", "laptop", "laser", "lasso", "laundry", "lava", "lava lamp", "lawn mower", "lawyer", "leader", "leaf", "leak", "leash", "leather", "leave", "leech", "legs", "lemon", "lemonade", "lemur", "lens", "leprechaun", "lettuce", "levitate", "librarian", "library", "licorice", "lid", "lightbulb", "lighter", "lighthouse", "lightning", "lightsaber", "lily", "lilypad", "limbo", "lime", "limousine", "line", "link", "lion", "lips", "lipstick", "litter box", "lizard", "llama", "loading", "loaf", "lobster", "lock", "log", "logo", "lollipop", "loot", "loser", "lotion", "lottery", "lounge", "love", "low", "luck", "luggage", "lumberjack", "lung", "lynx", "lyrics", "macaroni", "machine", "macho", "mafia", "magazine", "magic", "magic trick", "magic wand", "magician", "magma", "magnet", "magnifier", "maid", "mailbox", "mailman", "makeup", "mall", "mammoth", "manatee", "manhole", "manicure", "mannequin", "mansion", "mantis", "map", "maracas", "marathon", "marble", "margarine", "marigold", "market", "marmalade", "marmot", "marshmallow", "mascot", "mask", "massage", "match", "matchbox", "mattress", "mayonnaise", "mayor", "maze", "meal", "meat", "meatball", "meatloaf", "mechanic", "meerkat", "megaphone", "melon", "melt", "meme", "mermaid", "message", "messy", "metal", "meteorite", "microphone", "microscope", "microwave", "midnight", "military", "milk", "milkman", "milkshake", "mime", "miner", "minigolf", "minivan", "mint", "minute", "mirror", "missile", "model", "mohawk", "mold", "mole", "money", "monk", "monkey", "monster", "moon", "moose", "mop", "morning", "mosquito", "moss", "moth", "mothball", "mother", "motherboard", "motorbike", "motorcycle", "mountain", "mouse", "mousetrap", "mouth", "movie", "mud", "muffin", "mug", "murderer", "muscle", "museum", "mushroom", "musket", "mustache", "mustard", "nachos", "nail", "nail file", "nail polish", "napkin", "narwhal", "nature", "navy", "neck", "needle", "neighbor", "neighborhood", "nerd", "nest", "network", "newspaper", "nickel", "night", "nightclub", "nightmare", "ninja", "noob", "noodle", "north", "nose", "nose hair", "nose ring", "nosebleed", "nostrils", "notebook", "notepad", "nothing", "notification", "novel", "nugget", "nuke", "nun", "nurse", "nut", "nutcracker", "nutmeg", "nutshell", "oar", "observatory", "ocean", "octagon", "octopus", "office", "oil", "old", "omelet", "onion", "open", "opera", "orange", "orangutan", "orbit", "orca", "orchestra", "orchid", "organ", "origami", "ostrich", "otter", "outside", "oval", "overweight", "owl", "oxygen", "oyster", "paddle", "page", "pain", "paint", "paintball", "pajamas", "palace", "palette", "palm", "palm tree", "pan", "pancake", "panda", "panpipes", "panther", "pants", "papaya", "paper", "paper bag", "parachute", "parade", "parakeet", "parents", "park", "parking", "parrot", "party", "password", "pasta", "pastry", "path", "patient", "patio", "patriot", "pause", "pavement", "paw", "peace", "peach", "peacock", "peanut", "pear", "peas", "peasant", "pedal", "pelican", "pencil", "pencil case", "pencil sharpener", "pendulum", "penguin", "peninsula", "penny", "pensioner", "pepper", "pepperoni", "perfume", "periscope", "person", "pet food", "pet shop", "petal", "pharmacist", "photo frame", "photograph", "photographer", "piano", "pickaxe", "pickle", "picnic", "pie", "pig", "pigeon", "piggy bank", "pigsty", "pike", "pill", "pillar", "pillow", "pillow fight", "pilot", "pimple", "pin", "pinball", "pine", "pine cone", "pineapple", "pink", "pinky", "pinwheel", "pipe", "pirate", "pirate ship", "pistachio", "pistol", "pitchfork", "pizza", "plague", "planet", "plank", "plate", "platypus", "player", "playground", "plow", "plug", "plumber", "plunger", "pocket", "pogo stick", "point", "poison", "poisonous", "poke", "polar bear", "policeman", "pollution", "polo", "pond", "pony", "ponytail", "poodle", "poop", "poor", "popcorn", "pope", "poppy", "popular", "porch", "porcupine", "portal", "portrait", "positive", "postcard", "poster", "pot", "pot of gold", "potato", "potion", "pound", "powder", "prawn", "pray", "preach", "pregnant", "present", "president", "pretzel", "price tag", "priest", "prince", "princess", "printer", "prism", "prison", "pro", "procrastination", "professor", "programmer", "promotion", "protest", "provoke", "prune", "pub", "pudding", "puddle", "puffin", "puma", "pumpkin", "punishment", "punk", "puppet", "purity", "purse", "puzzle", "pyramid", "quarter", "queen", "queue", "quicksand", "quill", "quilt", "quokka", "raccoon", "race", "racecar", "radar", "radiation", "radio", "radish", "raft", "rail", "rain", "rainbow", "raincoat", "raindrop", "rainforest", "raisin", "rake", "ram", "ramp", "rapper", "raspberry", "rat", "ravioli", "razor", "razorblade", "read", "reality", "reception", "receptionist", "record", "rectangle", "recycling", "red", "red carpet", "reeds", "referee", "reflection", "reindeer", "relationship", "religion", "remote", "repeat", "reptile", "rest", "restaurant", "retail", "revolver", "rewind", "rhinoceros", "rib", "ribbon", "rice", "ring", "ringtone", "risk", "river", "roadblock", "robber", "robin", "robot", "rock", "rocket", "rockstar", "roll", "roof", "room", "rooster", "root", "rose", "royal", "rubber", "ruby", "rug", "ruler", "run", "rune", "sad", "saddle", "safari", "safe", "sailboat", "salad", "sale", "saliva", "salmon", "salt", "saltwater", "sand", "sand castle", "sandbox", "sandstorm", "sandwich", "satellite", "sauce", "sauna", "sausage", "saxophone", "scar", "scarecrow", "scarf", "scary", "scent", "school", "science", "scientist", "scissors", "scoop", "score", "scream", "screen", "screw", "scribble", "scuba", "sculpture", "scythe", "sea", "sea lion", "seafood", "seagull", "seahorse", "seal", "search", "seashell", "seasick", "season", "seat belt", "seaweed", "second", "security", "seed", "seesaw", "semicircle", "sensei", "server", "sew", "sewing machine", "shadow", "shake", "shallow", "shampoo", "shape", "shark", "shaving cream", "sheep", "shelf", "shell", "shipwreck", "shirt", "shock", "shoe", "shoebox", "shoelace", "shop", "shopping", "shopping cart", "short", "shotgun", "shoulder", "shout", "shovel", "shower", "shrew", "shrub", "shy", "sick", "signature", "silence", "silo", "silver", "silverware", "sing", "sink", "sit", "six pack", "skateboard", "skateboarder", "skates", "skeleton", "ski", "ski jump", "skin", "skinny", "skribbl.io", "skull", "skunk", "sky", "skydiving", "skyline", "skyscraper", "slam", "sledge", "sledgehammer", "sleep", "sleeve", "slide", "slime", "slingshot", "slippery", "slope", "sloth", "slow", "slump", "smell", "smile", "smoke", "snail", "snake", "sneeze", "sniper", "snow", "snowball", "snowball fight", "snowboard", "snowflake", "snowman", "soap", "soccer", "social media", "socket", "socks", "soda", "soil", "soldier", "sombrero", "son", "sound", "soup", "south", "space", "space suit", "spaceship", "spade", "spaghetti", "spark", "sparkles", "spatula", "speaker", "spear", "spelunker", "sphinx", "spider", "spin", "spinach", "spine", "spiral", "spit", "spoiler", "sponge", "spool", "spoon", "spore", "sports", "spray paint", "spring", "sprinkler", "spy", "square", "squid", "squirrel", "stab", "stadium", "stage", "stamp", "stand", "stapler", "star", "starfish", "starfruit", "statue", "steam", "step", "stereo", "sting", "stingray", "stomach", "stone", "stoned", "stop sign", "stork", "storm", "stove", "straw", "strawberry", "streamer", "street", "stress", "strong", "student", "studio", "study", "stylus", "submarine", "subway", "sugar", "suitcase", "summer", "sun", "sunburn", "sunflower", "sunglasses", "sunrise", "sunshade", "supermarket", "superpower", "surface", "surfboard", "surgeon", "survivor", "sushi", "swag", "swamp", "swan", "swarm", "sweat", "sweater", "swimming pool", "swimsuit", "swing", "switch", "sword", "swordfish", "symphony", "table", "table tennis", "tablecloth", "tablet", "tabletop", "taco", "tadpole", "tail", "tailor", "take off", "talent show", "tampon", "tangerine", "tank", "tape", "tarantula", "target", "taser", "tattoo", "taxi", "taxi driver", "tea", "teacher", "teapot", "tear", "teaspoon", "teddy bear", "telephone", "telescope", "television", "temperature", "tennis", "tennis racket", "tent", "tentacle", "text", "thermometer", "thief", "thin", "think", "thirst", "throat", "throne", "thug", "thumb", "thunder", "thunderstorm", "ticket", "tickle", "tie", "tiger", "time machine", "timpani", "tiny", "tip", "tiramisu", "tire", "tired", "tissue", "tissue box", "toad", "toast", "toaster", "toe", "toenail", "toilet", "tomato", "tomb", "tombstone", "tongue", "toolbox", "tooth", "toothbrush", "toothpaste", "toothpick", "top hat", "torch", "tornado", "torpedo", "tortoise", "totem", "toucan", "touch", "tourist", "tow truck", "towel", "tower", "toy", "tractor", "traffic", "traffic light", "trailer", "train", "translate", "trap", "trapdoor", "trash can", "traveler", "treadmill", "treasure", "tree", "treehouse", "trend", "triangle", "trick shot", "tricycle", "trigger", "triplets", "tripod", "trombone", "trophy", "tropical", "truck", "truck driver", "trumpet", "tuba", "tug", "tumor", "tuna", "tunnel", "turd", "turkey", "turnip", "turtle", "tuxedo", "twig", "type", "udder", "ukulele", "umbrella", "uncle", "underground", "underweight", "undo", "unibrow", "unicorn", "unicycle", "uniform", "universe", "upgrade", "vacation", "vaccine", "vacuum", "valley", "vampire", "vanilla", "vanish", "vault", "vegetable", "vegetarian", "vein", "vent", "vertical", "veterinarian", "victim", "victory", "video", "video game", "village", "villain", "vine", "vinegar", "viola", "violence", "violin", "virtual reality", "virus", "vise", "vision", "vitamin", "vlogger", "vodka", "volcano", "volleyball", "volume", "vomit", "voodoo", "vortex", "vote", "vulture", "vuvuzela", "waffle", "waist", "waiter", "wake up", "walk", "wall", "wallpaper", "walnut", "walrus", "warehouse", "warm", "wart", "wasp", "watch", "water", "water cycle", "water gun", "waterfall", "wave", "wax", "weak", "wealth", "weapon", "weasel", "weather", "web", "website", "wedding", "welder", "well", "werewolf", "west", "western", "whale", "wheel", "wheelbarrow", "whisk", "whisper", "whistle", "white", "wife", "wig", "wiggle", "willow", "wind", "windmill", "window", "windshield", "wine", "wine glass", "wing", "wingnut", "winner", "winter", "wire", "wireless", "witch", "witness", "wizard", "wolf", "wonderland", "woodpecker", "wool", "work", "workplace", "world", "worm", "wound", "wrapping", "wreath", "wrench", "wrestler", "wrestling", "wrinkle", "wrist", "writer", "x-ray", "xylophone", "yacht", "yardstick", "yawn", "yearbook", "yellow", "yeti", "yo-yo", "yogurt", "yolk", "young", "youtuber", "zebra", "zeppelin", "zigzag", "zipline", "zipper", "zombie", "zoo", "zoom"];

  const state = {
    initialized: false,
    running: false,
    closeHitPending: null,
    currentHintRaw: '',
    currentUnderscorePattern: '',
    currentLetterPattern: '',
    candidates: [],
    queue: [],
    sentThisRound: new Set(),
    sentAttempts: new Map(),
    retryMap: new Map(),
    lastGuess: '',
    words: [],
    wordsLoaded: false,
    roundToken: '',
    lastError: '',
    wordCount: 0,
    loopTimer: null,
    selectors: {
      input: null,
      send: null,
      hint: null,
      chat: null,
      roundRoot: null,
    },
    ui: null,
    observers: {
      hint: null,
      chat: null,
      round: null,
    },
    initAttempts: 0,
    automationArmed: false,
    lastGamePhase: 'unknown',
    selfName: '',
    lastChatTextLen: 0,
    spamBlockedUntil: 0,
    cooldownRemainingMs: 0,
  };

  function loadSettings() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return { ...DEFAULT_SETTINGS, ...parsed };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  const settings = loadSettings();

  function saveSettings() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }

  function onReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
      return;
    }
    fn();
  }

  function normalizeWord(value) {
    return (value || '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');
  }

  function cleanPatternPunctuation(value) {
    return (value || '').replace(/['".,!?()]/g, '');
  }

  function matchesUnderscorePattern(word, pattern) {
    const wordLower = normalizeWord(word);
    const patternLower = normalizeWord(pattern);
    const patternCleaned = cleanPatternPunctuation(patternLower);
    const wordCleaned = cleanPatternPunctuation(wordLower);

    if (!patternCleaned.includes('_')) return true;
    if (wordCleaned.length !== patternCleaned.length) return false;

    for (let i = 0; i < patternCleaned.length; i++) {
      const p = patternCleaned[i];
      const c = wordCleaned[i];
      if (p === '_') {
        if (c === ' ' || c === '-') return false;
        continue;
      }
      if (p !== c) return false;
    }
    return true;
  }

  function matchesLetterPattern(word, pattern) {
    if (!pattern || !pattern.trim()) return true;
    const parts = pattern.trim().split(/\s+/);

    if (parts.length === 1) {
      const p = parts[0];

      if (/^\d+$/.test(p)) {
        const count = parseInt(p, 10);
        if (word.includes(' ') || word.includes('-')) return false;
        return (word.match(/[a-zA-Z]/g) || []).length === count;
      }

      if (/^\d+-\d+$/.test(p)) {
        const [before, after] = p.split('-').map((n) => parseInt(n, 10));
        if (!word.includes('-') || word.includes(' ')) return false;

        const letters = word.match(/[a-zA-Z]/g) || [];
        if (letters.length !== before + after) return false;

        let letterCount = 0;
        for (let i = 0; i < word.length; i++) {
          if (/[a-zA-Z]/.test(word[i])) {
            letterCount++;
            if (letterCount === before && word[i + 1] === '-') {
              return true;
            }
          }
        }
        return false;
      }

      if (/^[a-zA-Z]+\d+$/.test(p)) {
        const m = p.match(/^([a-zA-Z]+)(\d+)$/);
        if (!m) return false;
        const start = m[1].toLowerCase();
        const count = parseInt(m[2], 10);
        if (word.includes(' ') || word.includes('-')) return false;

        const letters = word.match(/[a-zA-Z]/g) || [];
        return letters.length === start.length + count && word.toLowerCase().startsWith(start);
      }

      if (/^\d+[a-zA-Z]+/.test(p) && /[a-zA-Z]+\d+/.test(p)) {
        const segments = [];
        let current = '';
        let type = null;
        for (const ch of p) {
          const isDigit = /\d/.test(ch);
          const nextType = isDigit ? 'count' : 'letters';
          if (!type || type === nextType) {
            current += ch;
            type = nextType;
          } else {
            segments.push({ type, value: current });
            current = ch;
            type = nextType;
          }
        }
        if (current) segments.push({ type, value: current });

        if (word.includes(' ') || word.includes('-')) return false;

        const letters = word.match(/[a-zA-Z]/g) || [];
        let total = 0;
        let pos = 0;

        for (const segment of segments) {
          if (segment.type === 'count') {
            const c = parseInt(segment.value, 10);
            total += c;
            pos += c;
          } else {
            total += segment.value.length;
            for (let i = 0; i < segment.value.length; i++) {
              if ((letters[pos + i] || '').toLowerCase() !== segment.value[i].toLowerCase()) {
                return false;
              }
            }
            pos += segment.value.length;
          }
        }

        return letters.length === total;
      }

      if (/^\d+[a-zA-Z]+$/.test(p)) {
        const m = p.match(/^(\d+)([a-zA-Z]+)$/);
        if (!m) return false;
        const count = parseInt(m[1], 10);
        const ending = m[2].toLowerCase();
        if (word.includes(' ') || word.includes('-')) return false;

        const letters = word.match(/[a-zA-Z]/g) || [];
        return letters.length === count + ending.length && word.toLowerCase().endsWith(ending);
      }
    }

    if (parts.every((p) => /^\d+$/.test(p))) {
      const wordParts = word.split(/\s+/);
      if (wordParts.length !== parts.length) return false;
      return wordParts.every((wordPart, i) => {
        const expected = parseInt(parts[i], 10);
        return wordPart.replace(/[^a-zA-Z]/g, '').length === expected;
      });
    }

    return true;
  }

  function convertToLetterPattern(p) {
    const cleaned = cleanPatternPunctuation(p || '');

    if (cleaned.includes(' ')) {
      const words = cleaned.split(' ');
      return words
        .map((word) => (word.match(/_/g) || []).length + (word.match(/[a-z]/gi) || []).length)
        .join(' ');
    }

    if (cleaned.includes('-')) {
      const parts = cleaned.split('-');
      if (parts.length === 2) {
        const before = (parts[0].match(/[_a-z]/gi) || []).length;
        const after = (parts[1].match(/[_a-z]/gi) || []).length;
        return `${before}-${after}`;
      }
    }

    const known = [];
    let totalLength = 0;

    for (let i = 0; i < cleaned.length; i++) {
      const ch = cleaned[i];
      if (ch === '_' || /[a-z]/i.test(ch)) {
        totalLength++;
        if (/[a-z]/i.test(ch)) known.push({ pos: totalLength, letter: ch });
      }
    }

    if (known.length === 1) {
      const k = known[0];
      return `${k.pos - 1}${k.letter}${totalLength - k.pos}`;
    }

    return totalLength ? String(totalLength) : '';
  }

  function parseHint(rawHint) {
    const hint = normalizeWord(rawHint);
    const underscorePattern = hint;
    const letterPattern = hint.includes('_') ? convertToLetterPattern(hint) : '';
    return { hint, underscorePattern, letterPattern };
  }

  function rankCandidates(candidates, pattern) {
    const patternKnownCount = (pattern.match(/[a-z]/gi) || []).length;
    return candidates
      .map((word) => {
        const normalized = normalizeWord(word);
        const score =
          patternKnownCount * 10 +
          (normalized.includes('-') ? 1 : 0) +
          (normalized.includes(' ') ? 2 : 0) +
          normalized.length / 100;
        return { word, score };
      })
      .sort((a, b) => b.score - a.score || a.word.localeCompare(b.word))
      .map((x) => x.word);
  }

  function uniqueCaseInsensitive(values) {
    const seen = new Set();
    const out = [];
    for (const value of values) {
      const n = normalizeWord(value);
      if (!n || seen.has(n)) continue;
      seen.add(n);
      out.push(n);
    }
    return out;
  }

  function persistWordCache() {
    try {
      localStorage.setItem(
        WORD_CACHE_KEY,
        JSON.stringify({ version: '1', savedAt: Date.now(), words: state.words })
      );
    } catch {
      // ignore cache write failures
    }
  }

  function addWordToList(rawWord) {
    const cleaned = normalizeWord(rawWord);
    if (!cleaned) {
      setStatus('Word add ignored (empty)');
      return;
    }

    const exists = state.words.some((w) => normalizeWord(w) === cleaned);
    if (exists) {
      setStatus(`Word already exists: ${cleaned}`);
      return;
    }

    state.words.push(cleaned);
    state.words = uniqueCaseInsensitive(state.words);
    state.wordCount = state.words.length;
    persistWordCache();
    refreshCandidates('word added');
    setStatus(`Word added: ${cleaned}`);
  }

  function removeWordFromList(rawWord) {
    const cleaned = normalizeWord(rawWord);
    if (!cleaned) {
      setStatus('Word remove ignored (empty)');
      return;
    }

    const before = state.words.length;
    state.words = state.words.filter((w) => normalizeWord(w) !== cleaned);
    state.wordCount = state.words.length;

    if (state.words.length === before) {
      setStatus(`Word not found: ${cleaned}`);
      return;
    }

    persistWordCache();
    refreshCandidates('word removed');
    setStatus(`Word removed: ${cleaned}`);
  }

  function dedupeWordList() {
    const before = state.words.length;
    state.words = uniqueCaseInsensitive(state.words);
    state.wordCount = state.words.length;
    persistWordCache();
    refreshCandidates('word dedupe');
    setStatus(`Dedupe complete: removed ${before - state.words.length}`);
  }

  async function loadWords() {
    try {
      const cached = JSON.parse(localStorage.getItem(WORD_CACHE_KEY) || 'null');
      if (cached && Array.isArray(cached.words) && cached.words.length > 1000) {
        state.words = uniqueCaseInsensitive(cached.words);
        state.wordCount = state.words.length;
        state.wordsLoaded = state.words.length > 0;
        setStatus(`Word list loaded from cache: ${state.wordCount}`);
        return;
      }
    } catch {
      // fallback to rebuild cache
    }

    const urls = [
      'https://raw.githubusercontent.com/Sv443/skribblio-word-lists/master/en_words.txt',
      'https://raw.githubusercontent.com/luukdv/scribblio-wordlist/master/words/en.txt',
      'https://cdn.jsdelivr.net/gh/Sv443/skribblio-word-lists@master/en_words.txt',
    ];

    const merged = [...BUNDLED_WORDS, 'SUV'];

    for (const url of urls) {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) continue;
        const text = await res.text();
        merged.push(...text.split(/\r?\n/));
      } catch {
        // non-fatal
      }
    }

    state.words = uniqueCaseInsensitive(merged);
    state.wordCount = state.words.length;
    state.wordsLoaded = state.words.length > 0;

    persistWordCache();

    setStatus(state.wordsLoaded ? `Word list built + cached: ${state.words.length}` : 'Word list unavailable');
  }


  function isVisibleElement(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function querySelectorAny(selectors, visibleOnly = false) {
    for (const selector of selectors) {
      const nodes = Array.from(document.querySelectorAll(selector));
      const found = visibleOnly ? nodes.find((node) => isVisibleElement(node)) : nodes[0];
      if (found) return found;
    }
    return null;
  }

  function bindGameSelectors() {
    state.selectors.hint = querySelectorAny([
      '#currentWord',
      '.current-word',
      '.word .hints',
      '.wordHints',
      '.hints',
      '[class*="current"][class*="word"]',
      '[class*="word"] [class*="hint"]',
      '.word',
    ], true);

    state.selectors.chat = querySelectorAny([
      '.chat-content',
      '.chat .content',
      '.chatMessages',
      '[class*="chat"] [class*="content"]',
    ]);

    state.selectors.input = querySelectorAny([
      'input[placeholder*="guess" i]',
      'input[placeholder*="Type your guess" i]',
      '#inputChat',
      '.chat-form input[type="text"]',
      '.chat input[type="text"]',
      'input[type="text"]',
    ], true);

    state.selectors.send = querySelectorAny([
      '.chat-form button[type="submit"]',
      '.chat form button',
      '.chat button',
      'button[type="submit"]',
    ]);

    state.selectors.roundRoot = querySelectorAny([
      '#game-wrapper',
      '#gameContainer',
      '.game',
      'main',
      'body',
    ]);

    return Boolean(state.selectors.hint || state.selectors.chat || state.selectors.input);
  }

  function sanitizeHintText(text) {
    return (text || '')
      .replace(/\s+/g, ' ')
      .replace(/[|]/g, ' ')
      .trim()
      .toLowerCase();
  }

  function isLikelyHintPattern(text) {
    if (!text) return false;
    if (text.length > 48) return false;
    if (!/^[a-z_\-\s]+$/.test(text)) return false;
    if (!text.includes('_')) return false;
    return true;
  }

  function findHintCandidateText() {
    const hintSources = [
      state.selectors.hint,
      querySelectorAny(['#currentWord', '.current-word', '.wordHints', '.word .hints', '.hints'], true),
    ].filter(Boolean);

    for (const node of hintSources) {
      const t = sanitizeHintText(node.textContent || '')
        .replace(/[^a-z_\-\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (isLikelyHintPattern(t)) return t;
    }

    const guessLabel = Array.from(document.querySelectorAll('div,span,strong,h1,h2')).find((el) =>
      /guess this/i.test(el.textContent || '')
    );

    if (guessLabel?.parentElement) {
      const cleaned = sanitizeHintText(guessLabel.parentElement.textContent || '')
        .replace(/guess this/ig, '')
        .replace(/[^a-z_\-\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (isLikelyHintPattern(cleaned)) return cleaned;
    }

    return '';
  }


  function extractLengthFromHintArea() {
    const candidates = [
      document.querySelector('#currentWordLength'),
      document.querySelector('.word-length'),
      document.querySelector('.wordLength'),
      state.selectors.hint && state.selectors.hint.parentElement,
      Array.from(document.querySelectorAll('div,span,strong')).find((el) => /guess this/i.test(el.textContent || '')),
    ].filter(Boolean);

    for (const el of candidates) {
      const nums = (el.textContent || '').match(/\b(\d{1,2})\b/g);
      if (!nums || !nums.length) continue;
      const val = parseInt(nums[nums.length - 1], 10);
      if (val >= 2 && val <= 25) return val;
    }

    return null;
  }



  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function getSelfName() {
    if (state.selfName) return state.selfName;

    const youNode = Array.from(document.querySelectorAll('div,span,li')).find((el) =>
      /\(you\)/i.test(el.textContent || '')
    );

    if (!youNode) return '';

    const raw = (youNode.textContent || '')
      .replace(/\(you\)/ig, '')
      .replace(/\s+/g, ' ')
      .trim();

    state.selfName = raw.toLowerCase();
    return state.selfName;
  }

  function isBetweenRoundOverlayVisible() {
    const statusNodes = [
      ...document.querySelectorAll('.round, .status, .info, .announcement, .result, [class*="round"], [class*="result"]'),
    ].filter((el) => isVisibleElement(el));

    for (const el of statusNodes) {
      const t = (el.textContent || '').toLowerCase().trim();
      if (!t || t.length > 120) continue;
      if (/\bthe word was\b/.test(t) || /\bround over\b/.test(t) || /\bnext round\b/.test(t)) {
        return true;
      }
    }

    return false;
  }

  function isBetweenWordsVisible() {
    const statusNodes = [
      ...document.querySelectorAll('.round, .status, .info, .announcement, [class*="round"], [class*="status"]'),
    ].filter((el) => isVisibleElement(el));

    for (const el of statusNodes) {
      const t = (el.textContent || '').toLowerCase().trim();
      if (!t || t.length > 160) continue;
      if (/\bis choosing a word\b/.test(t) || /\bchoose a word\b/.test(t) || /\bpick a word\b/.test(t)) {
        return true;
      }
    }

    return false;
  }


  function getGamePhase() {
    const input = state.selectors.input;
    const hasWordChoices = Boolean(querySelectorAny(['.wordChoices', '.word-choices', '[class*="choose"] [class*="word"]'], true));

    if (hasWordChoices) return 'choosing';
    if (isBetweenWordsVisible()) return 'between-words';

    const drawingBanner = querySelectorAny([
      '.info',
      '.status',
      '.round',
      '[class*="draw"] [class*="info"]',
      '[class*="status"]',
    ], true);

    const bannerText = (drawingBanner?.textContent || '').toLowerCase();
    if (/you are drawing|you are the drawer|you are drawing now/.test(bannerText)) return 'drawing';

    if (isBetweenRoundOverlayVisible()) return 'between-rounds';

    const hint = findHintCandidateText();
    const hasHint = Boolean(hint) || Boolean(extractLengthFromHintArea());
    const canTypeGuess = Boolean(input && !input.disabled && !input.readOnly && /guess/i.test(input.placeholder || ''));

    if (canTypeGuess && hasHint) return 'guessing';
    if (canTypeGuess) return 'waiting-hint';
    return 'unknown';
  }


  function isAutomationAllowed() {
    const phase = getGamePhase();
    state.lastGamePhase = phase;
    return phase === 'guessing';
  }

  function getHintText() {
    let hint = findHintCandidateText();

    if (!hint) {
      const len = extractLengthFromHintArea();
      if (len) return '_'.repeat(len);
      return '';
    }

    hint = hint
      .replace(/[^a-z_\-\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!hint.includes('_')) {
      const len = extractLengthFromHintArea();
      if (len) hint = '_'.repeat(len);
    }

    return hint;
  }

  function setStatus(text, isError = false) {
    if (!state.ui) return;
    state.lastError = isError ? text : '';
    state.ui.status.textContent = text;
    state.ui.status.style.color = isError ? '#b00020' : '#2d3748';
  }

  function refreshCandidates(reason = 'update') {
    const rawHint = getHintText();
    state.currentHintRaw = rawHint;

    const { hint, underscorePattern, letterPattern } = parseHint(rawHint);
    state.currentUnderscorePattern = underscorePattern;
    state.currentLetterPattern = letterPattern;

    if (!isAutomationAllowed()) {
      state.candidates = [];
      state.queue = [];
      renderDebug(`${reason} (${state.lastGamePhase})`);
      return;
    }

    let candidates = state.words.slice();

    if (letterPattern) {
      candidates = candidates.filter((word) => matchesLetterPattern(word, letterPattern));
    }

    if (hint && hint.includes('_')) {
      candidates = candidates.filter((word) => matchesUnderscorePattern(word, hint));
    }

    state.candidates = rankCandidates(uniqueCaseInsensitive(candidates), hint).slice(0, LIMITS.queueBurstLimit);

    if (state.running) {
      buildQueueFromCandidates();
    }

    renderDebug(reason);
  }

  function buildQueueFromCandidates(options = {}) {
    const { preserveExisting = true } = options;

    const queue = preserveExisting ? state.queue.slice() : [];
    const queuedSet = new Set(queue);

    for (const word of state.candidates) {
      const n = normalizeWord(word);
      if (!n) continue;
      if (state.sentThisRound.has(n) || (state.sentAttempts.get(n) || 0) > 0) continue;
      if (queuedSet.has(n)) continue;
      queue.push(n);
      queuedSet.add(n);
    }

    state.queue = queue;
  }

  function stopAutomation(reason = 'Stopped') {
    state.running = false;
    if (state.loopTimer) {
      clearTimeout(state.loopTimer);
      state.loopTimer = null;
    }
    setStatus(reason);
    renderDebug('stopped');
  }

  function setNativeValue(element, value) {
    const valueSetter = Object.getOwnPropertyDescriptor(element, 'value')?.set;
    const prototype = Object.getPrototypeOf(element);
    const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

    if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
      prototypeValueSetter.call(element, value);
    } else if (valueSetter) {
      valueSetter.call(element, value);
    } else {
      element.value = value;
    }
  }

  function sendGuess(text) {
    const input = state.selectors.input;
    if (!input || input.disabled || input.readOnly) {
      setStatus('Chat input not found/usable', true);
      return false;
    }

    input.focus();
    setNativeValue(input, text);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));

    const enterOpts = { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true };
    input.dispatchEvent(new KeyboardEvent('keydown', enterOpts));
    input.dispatchEvent(new KeyboardEvent('keypress', enterOpts));
    input.dispatchEvent(new KeyboardEvent('keyup', enterOpts));

    const form = input.closest('form');
    if (form) {
      if (typeof form.requestSubmit === 'function') {
        form.requestSubmit();
      } else {
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      }
    }

    if (state.selectors.send && !state.selectors.send.disabled) {
      state.selectors.send.click();
    }

    state.lastGuess = text;
    state.ui.lastGuess.textContent = text || '—';
    return true;
  }

  function enqueueCloseRetry(word) {
    const n = normalizeWord(word);
    if (!n) return;
    const retries = state.retryMap.get(n) || 0;
    if (retries >= LIMITS.maxRetries) return;
    state.retryMap.set(n, retries + 1);
    state.closeHitPending = n;
    if (state.running && !state.loopTimer) {
      tickQueue(false);
    }
  }


  function getConfiguredDelay() {
    const parsed = Number(settings.delayMs);
    const safe = Number.isFinite(parsed) ? parsed : DEFAULT_SETTINGS.delayMs;
    return Math.max(LIMITS.delayMin, Math.min(LIMITS.delayMax, safe));
  }

  function scheduleNextTick(waitMs) {
    if (state.loopTimer) {
      clearTimeout(state.loopTimer);
      state.loopTimer = null;
    }
    state.loopTimer = setTimeout(() => {
      state.loopTimer = null;
      tickQueue(false);
    }, Math.max(0, waitMs));
  }

  function tickQueue(immediate = false) {
    if (!state.running) return;
    const delay = getConfiguredDelay();

    if (Date.now() < state.spamBlockedUntil) {
      state.cooldownRemainingMs = Math.max(0, state.spamBlockedUntil - Date.now());
      setStatus(`Running (paused: spam ${Math.ceil(state.cooldownRemainingMs / 1000)}s)`);
      renderDebug('spam cooldown');
      scheduleNextTick(Math.min(LIMITS.tickPollMs, Math.max(50, delay)));
      return;
    }

    state.cooldownRemainingMs = 0;

    if (!isAutomationAllowed()) {
      setStatus(`Running (paused: ${state.lastGamePhase})`);
      renderDebug('paused phase');
      scheduleNextTick(Math.min(LIMITS.tickPollMs, Math.max(80, delay)));
      return;
    }

    if (state.closeHitPending) {
      const word = state.closeHitPending;
      state.closeHitPending = null;
      if (sendGuess(word)) {
        state.sentThisRound.add(word);
        setStatus(`Close-hit retry sent: ${word}`);
      }
    } else {
      const next = state.queue.shift();
      if (!next) {
        refreshCandidates('queue empty');
        setStatus('Running (paused: waiting for new letters/word)');
        renderDebug('queue empty wait');
        scheduleNextTick(Math.min(LIMITS.tickPollMs, Math.max(80, delay)));
        return;
      }

      const payload = settings.dotPrefix ? `.${next}` : next;
      state.sentAttempts.set(next, (state.sentAttempts.get(next) || 0) + 1);
      state.sentThisRound.add(next);
      if (sendGuess(payload)) {
        setStatus(`Sent guess: ${payload}`);
      } else {
        setStatus(`Send failed, skipped: ${payload}`, true);
      }
    }

    renderDebug('tick');
    scheduleNextTick(immediate ? delay : delay);
  }


  function startAutomation() {
    if (!state.wordsLoaded) {
      setStatus('Words still loading...', true);
      return;
    }

    if (!state.selectors.input) {
      bindGameSelectors();
      if (!state.selectors.input) {
        setStatus('Cannot start: chat input missing', true);
        return;
      }
    }

    state.running = true;
    state.automationArmed = true;
    refreshCandidates('start');
    buildQueueFromCandidates({ preserveExisting: state.queue.length > 0 });
    setStatus('Running');
    renderDebug('running');
    const kickoffDelay = Math.max(60, Math.min(getConfiguredDelay(), 500));
    scheduleNextTick(kickoffDelay);
  }

  function resetRoundState(reason = 'Round reset') {
    state.sentThisRound.clear();
    state.sentAttempts.clear();
    state.retryMap.clear();
    state.closeHitPending = null;
    state.queue = [];
    state.lastGuess = '';
    if (state.ui) {
      state.ui.lastGuess.textContent = '—';
    }
    if (state.running) {
      setStatus(`Running (paused: ${reason.toLowerCase()})`);
    }
    refreshCandidates(reason);
  }

  function parseChatSignals(rootText) {
    const fullText = rootText || '';

    if (fullText.length < state.lastChatTextLen) {
      state.lastChatTextLen = 0;
    }

    const delta = fullText.slice(state.lastChatTextLen);
    state.lastChatTextLen = fullText.length;
    const recent = delta.toLowerCase();
    if (!recent.trim()) return;

    if (/spam detected|sending messages too quickly/.test(recent)) {
      state.spamBlockedUntil = Date.now() + LIMITS.spamCooldownMs;
      setStatus('Running (paused: spam cooldown)');
      return;
    }

    const ownName = getSelfName();
    const ownSolved = /you guessed the word!/i.test(recent) ||
      (ownName && new RegExp(`\\b${escapeRegExp(ownName)}\\s+guessed the word!`, 'i').test(recent));

    if (ownSolved && state.running) {
      stopAutomation('Solved word detected, stopped');
      return;
    }

    const close = recent.match(/\.([^\s.!?,]+(?:\s+[^\s.!?,]+)*)\s+is close!/i);
    if (close && close[1]) {
      enqueueCloseRetry(close[1]);
    }

    if (/\bthe word was\b|\bround over\b|\bis drawing now\b|\bis choosing a word\b|\bchoose a word\b|\bpick a word\b/.test(recent)) {
      resetRoundState('Word/round transition detected');
    }
  }


  async function copyTextToClipboard(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // fallback below
    }

    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }

  function renderTopCandidates() {
    if (!state.ui?.candidateTop) return;

    const top = state.candidates.slice(0, LIMITS.candidatePreview);
    if (!top.length) {
      state.ui.candidateTop.textContent = '—';
      return;
    }

    state.ui.candidateTop.innerHTML = '';
    for (const word of top) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'sag-candidate-chip';
      chip.textContent = word;
      chip.addEventListener('click', async () => {
        const copied = await copyTextToClipboard(word);
        chip.classList.remove('copied');
        void chip.offsetWidth;
        chip.classList.add('copied');
        setTimeout(() => chip.classList.remove('copied'), 420);
        setStatus(copied ? `Copied: ${word}` : `Copy failed: ${word}`, !copied);
      });
      state.ui.candidateTop.appendChild(chip);
    }
  }

  function attachObservers() {
    if (state.observers.hint) state.observers.hint.disconnect();
    if (state.observers.chat) state.observers.chat.disconnect();
    if (state.observers.round) state.observers.round.disconnect();

    if (state.selectors.hint) {
      state.observers.hint = new MutationObserver(() => refreshCandidates('hint mutation'));
      state.observers.hint.observe(state.selectors.hint, { childList: true, subtree: true, characterData: true });
    }

    if (state.selectors.chat) {
      state.observers.chat = new MutationObserver(() => {
        const text = state.selectors.chat.textContent || '';
        parseChatSignals(text);
      });
      state.observers.chat.observe(state.selectors.chat, { childList: true, subtree: true, characterData: true });
    }

    if (state.selectors.roundRoot) {
      state.observers.round = new MutationObserver(() => {
        const roundText = (document.querySelector('.round')?.textContent || '').trim();
        const phase = getGamePhase();
        const token = `${roundText}::${phase}`;
        if (state.roundToken && token !== state.roundToken && /between-words|between-rounds|choosing/.test(phase)) {
          resetRoundState('Word/round DOM changed');
        }
        state.roundToken = token;
      });
      state.observers.round.observe(state.selectors.roundRoot, { childList: true, subtree: true });
    }
  }

  function renderDebug(context) {
    if (!state.ui) return;
    state.ui.hintRaw.textContent = state.currentHintRaw || '—';
    state.ui.hintNormalized.textContent = state.currentUnderscorePattern || '—';
    state.ui.letterPattern.textContent = state.currentLetterPattern || '—';
    state.ui.wordCount.textContent = String(state.wordCount || state.words.length || 0);
    state.ui.candidateCount.textContent = String(state.candidates.length);
    renderTopCandidates();
    state.ui.mode.textContent = state.running ? 'running' : 'stopped';
    state.ui.phase.textContent = state.lastGamePhase || 'unknown';
    state.ui.closeState.textContent = state.closeHitPending ? `pending: ${state.closeHitPending}` : 'none';
    state.ui.cooldown.textContent = state.cooldownRemainingMs > 0 ? `${Math.ceil(state.cooldownRemainingMs / 1000)}s` : '0s';
    state.ui.context.textContent = context;
  }

  function makeDraggable(panel, handle) {
    let dragging = false;
    let startX = 0;
    let startY = 0;

    const onMove = (e) => {
      if (!dragging) return;
      const x = e.clientX - startX;
      const y = e.clientY - startY;
      panel.style.left = `${Math.max(0, x)}px`;
      panel.style.top = `${Math.max(0, y)}px`;
      panel.style.right = 'auto';
      settings.panelX = Math.max(0, x);
      settings.panelY = Math.max(0, y);
      saveSettings();
    };

    const onUp = () => {
      dragging = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    handle.addEventListener('mousedown', (e) => {
      dragging = true;
      const rect = panel.getBoundingClientRect();
      startX = e.clientX - rect.left;
      startY = e.clientY - rect.top;
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      e.preventDefault();
    });
  }

  function createPanel() {
    const panel = document.createElement('div');
    panel.id = 'skribbl-auto-guesser-panel';
    panel.style.cssText = [
      'position:fixed',
      'z-index:2147483647',
      'background:#fff',
      'border:1px solid #d0d7de',
      'border-radius:10px',
      'box-shadow:0 8px 24px rgba(15,23,42,.18)',
      'color:#1f2937',
      'font:12px/1.35 Arial,sans-serif',
      'width:320px',
      'max-height:80vh',
      'overflow:auto',
      'padding:8px',
      settings.panelX != null && settings.panelY != null
        ? `left:${settings.panelX}px;top:${settings.panelY}px`
        : 'top:12px;right:12px',
    ].join(';');

    const style = document.createElement('style');
    style.textContent = `
      #skribbl-auto-guesser-panel {
        color: #111827 !important;
      }
      #skribbl-auto-guesser-panel strong,
      #skribbl-auto-guesser-panel span,
      #skribbl-auto-guesser-panel label {
        color: #111827 !important;
      }
      #skribbl-auto-guesser-panel input[type="text"],
      #skribbl-auto-guesser-panel input[type="number"] {
        color: #111827 !important;
        background: #ffffff !important;
        border: 1px solid #94a3b8 !important;
      }
      #skribbl-auto-guesser-panel button {
        border: 1px solid #cbd5e1 !important;
        border-radius: 6px !important;
        font-weight: 700 !important;
        line-height: 1.1 !important;
        cursor: pointer !important;
        color: #111827 !important;
        background: #f8fafc !important;
      }
      #skribbl-auto-guesser-panel #sag-start {
        background: #2563eb !important;
        color: #ffffff !important;
        border-color: #1d4ed8 !important;
      }
      #skribbl-auto-guesser-panel #sag-stop {
        background: #dc2626 !important;
        color: #ffffff !important;
        border-color: #b91c1c !important;
      }
      #skribbl-auto-guesser-panel #sag-refresh {
        background: #f8fafc !important;
        color: #111827 !important;
      }
      #skribbl-auto-guesser-panel #sag-add-word {
        background: #16a34a !important;
        color: #ffffff !important;
        border-color: #15803d !important;
      }
      #skribbl-auto-guesser-panel #sag-remove-word {
        background: #f97316 !important;
        color: #ffffff !important;
        border-color: #ea580c !important;
      }
      #skribbl-auto-guesser-panel #sag-dedupe {
        background: #0ea5e9 !important;
        color: #ffffff !important;
        border-color: #0284c7 !important;
      }

      #skribbl-auto-guesser-panel .sag-candidate-chip {
        display: inline-block;
        margin: 2px 4px 2px 0;
        padding: 2px 6px;
        border: 1px solid #93c5fd;
        border-radius: 10px;
        background: #eff6ff;
        color: #1e40af;
        font-size: 11px;
        cursor: pointer;
      }
      #skribbl-auto-guesser-panel .sag-candidate-chip.copied {
        background: #16a34a !important;
        border-color: #15803d !important;
        color: #ffffff !important;
      }
    `;
    document.head.appendChild(style);

    panel.innerHTML = `
      <div id="sag-header" style="display:flex;align-items:center;justify-content:space-between;cursor:move;gap:8px;margin-bottom:6px;">
        <strong>Skribbl Auto Guesser</strong>
        <button id="sag-collapse" style="border:1px solid #cbd5e1;background:#f8fafc;border-radius:6px;padding:2px 6px;cursor:pointer;">${settings.collapsed ? '+' : '−'}</button>
      </div>
      <div id="sag-body" style="display:${settings.collapsed ? 'none' : 'block'};">
        <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px;">
          <button id="sag-start" style="padding:5px 10px;">Start</button>
          <button id="sag-stop" style="padding:5px 10px;">Stop</button>
          <button id="sag-refresh" style="padding:5px 10px;">Refresh parse</button>
        </div>
        <label style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">Delay (ms)
          <input id="sag-delay" type="number" min="${LIMITS.delayMin}" max="${LIMITS.delayMax}" value="${settings.delayMs}" style="width:90px;" />
        </label>
        <label style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
          <input id="sag-dot" type="checkbox" ${settings.dotPrefix ? 'checked' : ''} /> Prefix with dot
        </label>
        <div style="display:flex;gap:4px;align-items:center;margin-bottom:8px;flex-wrap:wrap;">
          <input id="sag-word-input" type="text" placeholder="word" style="flex:1;min-width:100px;padding:3px 5px;" />
          <button id="sag-add-word" style="padding:4px 8px;">Add</button>
          <button id="sag-remove-word" style="padding:4px 8px;">Remove</button>
          <button id="sag-dedupe" style="padding:4px 8px;">Dedupe</button>
        </div>

        <div style="font-size:11px;display:grid;grid-template-columns:120px 1fr;gap:3px 6px;word-break:break-word;">
          <span>Status</span><span id="sag-status">Idle</span>
          <span>Raw hint</span><span id="sag-hint-raw">—</span>
          <span>Underscore pattern</span><span id="sag-hint-normalized">—</span>
          <span>Letter pattern</span><span id="sag-letter-pattern">—</span>
          <span>Word list size</span><span id="sag-word-count">0</span>
          <span>Candidate count</span><span id="sag-candidate-count">0</span>
          <span>Top candidates</span><span id="sag-candidate-top">—</span>
          <span>Last sent guess</span><span id="sag-last-guess">—</span>
          <span>Mode</span><span id="sag-mode">stopped</span>
          <span>Game phase</span><span id="sag-phase">unknown</span>
          <span>Close-hit</span><span id="sag-close">none</span>
          <span>Spam cooldown</span><span id="sag-cooldown">0s</span>
          <span>Context</span><span id="sag-context">init</span>
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    const header = panel.querySelector('#sag-header');
    makeDraggable(panel, header);

    const body = panel.querySelector('#sag-body');
    const collapse = panel.querySelector('#sag-collapse');
    const delayInput = panel.querySelector('#sag-delay');
    const dotToggle = panel.querySelector('#sag-dot');
    const wordInput = panel.querySelector('#sag-word-input');

    collapse.addEventListener('click', () => {
      settings.collapsed = !settings.collapsed;
      body.style.display = settings.collapsed ? 'none' : 'block';
      collapse.textContent = settings.collapsed ? '+' : '−';
      saveSettings();
    });

    delayInput.addEventListener('change', () => {
      const parsed = Number(delayInput.value);
      const value = Number.isFinite(parsed)
        ? Math.max(LIMITS.delayMin, Math.min(LIMITS.delayMax, parsed))
        : DEFAULT_SETTINGS.delayMs;
      settings.delayMs = value;
      delayInput.value = String(value);
      saveSettings();
    });

    dotToggle.addEventListener('change', () => {
      settings.dotPrefix = Boolean(dotToggle.checked);
      saveSettings();
      renderDebug('dot toggle');
    });

    panel.querySelector('#sag-start').addEventListener('click', startAutomation);
    panel.querySelector('#sag-stop').addEventListener('click', () => stopAutomation('Stopped by user'));
    panel.querySelector('#sag-refresh').addEventListener('click', () => {
      refreshCandidates('manual refresh');
      buildQueueFromCandidates({ preserveExisting: state.running });
      renderDebug('manual refresh');
    });

    panel.querySelector('#sag-add-word').addEventListener('click', () => {
      addWordToList(wordInput.value);
      wordInput.value = '';
    });
    panel.querySelector('#sag-remove-word').addEventListener('click', () => {
      removeWordFromList(wordInput.value);
      wordInput.value = '';
    });
    panel.querySelector('#sag-dedupe').addEventListener('click', () => {
      dedupeWordList();
    });

    state.ui = {
      panel,
      status: panel.querySelector('#sag-status'),
      hintRaw: panel.querySelector('#sag-hint-raw'),
      hintNormalized: panel.querySelector('#sag-hint-normalized'),
      letterPattern: panel.querySelector('#sag-letter-pattern'),
      wordCount: panel.querySelector('#sag-word-count'),
      candidateCount: panel.querySelector('#sag-candidate-count'),
      candidateTop: panel.querySelector('#sag-candidate-top'),
      lastGuess: panel.querySelector('#sag-last-guess'),
      mode: panel.querySelector('#sag-mode'),
      phase: panel.querySelector('#sag-phase'),
      closeState: panel.querySelector('#sag-close'),
      cooldown: panel.querySelector('#sag-cooldown'),
      context: panel.querySelector('#sag-context'),
    };
  }

  function initWithRetry() {
    if (!state.ui) {
      createPanel();
    }

    const found = bindGameSelectors();
    attachObservers();
    refreshCandidates('init');

    state.initAttempts++;
    if (!found && state.initAttempts <= LIMITS.maxRetries) {
      setStatus(`UI not ready, retry ${state.initAttempts}/${LIMITS.maxRetries}`);
      setTimeout(initWithRetry, 1500);
      return;
    }

    if (!found) {
      setStatus('Game UI not fully detected; monitoring for recovery', true);
    } else {
      setStatus('Ready');
    }

    state.initialized = true;
  }

  onReady(async () => {
    await loadWords();
    initWithRetry();

    setInterval(() => {
      const hadInput = Boolean(state.selectors.input);
      bindGameSelectors();
      if (!hadInput && state.selectors.input) {
        setStatus('Recovered chat input');
      }
    }, 4000);
  });
})();
