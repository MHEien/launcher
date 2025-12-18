/**
 * Emoji Picker Plugin
 * 
 * Search and copy emojis to clipboard with support for
 * recent emojis, favorites, and skin tone variants.
 */

declare const Host: {
  inputString(): string;
  outputString(s: string): void;
};

declare const hostLog: (level: string, message: string) => void;
declare const hostGetConfig: (key: string) => string | null;
declare const hostSetConfig: (key: string, value: string) => void;

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  icon?: string;
  score?: number;
  category?: string;
  action?: {
    type: 'copy';
    value: string;
  };
}

interface SearchInput {
  query: string;
}

interface SearchOutput {
  results: SearchResult[];
}

interface Emoji {
  emoji: string;
  name: string;
  keywords: string[];
  category: string;
}

interface AIToolInput {
  tool: string;
  arguments: Record<string, unknown>;
}

// Emoji database - common emojis organized by category
const EMOJIS: Emoji[] = [
  // Smileys & Emotion
  { emoji: '😀', name: 'grinning face', keywords: ['smile', 'happy', 'joy'], category: 'smileys' },
  { emoji: '😃', name: 'grinning face with big eyes', keywords: ['smile', 'happy', 'joy', 'excited'], category: 'smileys' },
  { emoji: '😄', name: 'grinning face with smiling eyes', keywords: ['smile', 'happy', 'joy', 'laugh'], category: 'smileys' },
  { emoji: '😁', name: 'beaming face with smiling eyes', keywords: ['smile', 'happy', 'grin'], category: 'smileys' },
  { emoji: '😅', name: 'grinning face with sweat', keywords: ['hot', 'nervous', 'awkward'], category: 'smileys' },
  { emoji: '😂', name: 'face with tears of joy', keywords: ['laugh', 'lol', 'funny', 'haha'], category: 'smileys' },
  { emoji: '🤣', name: 'rolling on the floor laughing', keywords: ['laugh', 'lol', 'rofl', 'funny'], category: 'smileys' },
  { emoji: '😊', name: 'smiling face with smiling eyes', keywords: ['smile', 'happy', 'blush', 'shy'], category: 'smileys' },
  { emoji: '😇', name: 'smiling face with halo', keywords: ['angel', 'innocent', 'blessed'], category: 'smileys' },
  { emoji: '🙂', name: 'slightly smiling face', keywords: ['smile', 'ok'], category: 'smileys' },
  { emoji: '😉', name: 'winking face', keywords: ['wink', 'flirt', 'joke'], category: 'smileys' },
  { emoji: '😍', name: 'smiling face with heart-eyes', keywords: ['love', 'crush', 'heart'], category: 'smileys' },
  { emoji: '🥰', name: 'smiling face with hearts', keywords: ['love', 'adore', 'hearts'], category: 'smileys' },
  { emoji: '😘', name: 'face blowing a kiss', keywords: ['kiss', 'love', 'flirt'], category: 'smileys' },
  { emoji: '😋', name: 'face savoring food', keywords: ['yum', 'delicious', 'tasty'], category: 'smileys' },
  { emoji: '😎', name: 'smiling face with sunglasses', keywords: ['cool', 'sunglasses', 'chill'], category: 'smileys' },
  { emoji: '🤩', name: 'star-struck', keywords: ['wow', 'amazing', 'star', 'excited'], category: 'smileys' },
  { emoji: '🥳', name: 'partying face', keywords: ['party', 'celebrate', 'birthday'], category: 'smileys' },
  { emoji: '😏', name: 'smirking face', keywords: ['smirk', 'suggestive', 'flirt'], category: 'smileys' },
  { emoji: '😒', name: 'unamused face', keywords: ['meh', 'annoyed', 'bored'], category: 'smileys' },
  { emoji: '😞', name: 'disappointed face', keywords: ['sad', 'disappointed', 'down'], category: 'smileys' },
  { emoji: '😔', name: 'pensive face', keywords: ['sad', 'pensive', 'thoughtful'], category: 'smileys' },
  { emoji: '😟', name: 'worried face', keywords: ['worried', 'concerned', 'anxious'], category: 'smileys' },
  { emoji: '😕', name: 'confused face', keywords: ['confused', 'puzzled', 'unsure'], category: 'smileys' },
  { emoji: '🙁', name: 'slightly frowning face', keywords: ['sad', 'frown', 'disappointed'], category: 'smileys' },
  { emoji: '😢', name: 'crying face', keywords: ['cry', 'sad', 'tear'], category: 'smileys' },
  { emoji: '😭', name: 'loudly crying face', keywords: ['cry', 'sob', 'sad', 'tears'], category: 'smileys' },
  { emoji: '😤', name: 'face with steam from nose', keywords: ['angry', 'frustrated', 'triumph'], category: 'smileys' },
  { emoji: '😠', name: 'angry face', keywords: ['angry', 'mad', 'annoyed'], category: 'smileys' },
  { emoji: '😡', name: 'pouting face', keywords: ['angry', 'rage', 'mad'], category: 'smileys' },
  { emoji: '🤬', name: 'face with symbols on mouth', keywords: ['swear', 'curse', 'angry'], category: 'smileys' },
  { emoji: '😱', name: 'face screaming in fear', keywords: ['scream', 'fear', 'shock', 'scared'], category: 'smileys' },
  { emoji: '😨', name: 'fearful face', keywords: ['fear', 'scared', 'worried'], category: 'smileys' },
  { emoji: '😰', name: 'anxious face with sweat', keywords: ['nervous', 'anxious', 'worried'], category: 'smileys' },
  { emoji: '😳', name: 'flushed face', keywords: ['blush', 'embarrassed', 'shy'], category: 'smileys' },
  { emoji: '🤔', name: 'thinking face', keywords: ['think', 'hmm', 'wonder', 'consider'], category: 'smileys' },
  { emoji: '🤗', name: 'hugging face', keywords: ['hug', 'embrace', 'love'], category: 'smileys' },
  { emoji: '🤭', name: 'face with hand over mouth', keywords: ['oops', 'giggle', 'shy'], category: 'smileys' },
  { emoji: '🤫', name: 'shushing face', keywords: ['quiet', 'shh', 'secret'], category: 'smileys' },
  { emoji: '🤥', name: 'lying face', keywords: ['lie', 'pinocchio', 'liar'], category: 'smileys' },
  { emoji: '😴', name: 'sleeping face', keywords: ['sleep', 'tired', 'zzz'], category: 'smileys' },
  { emoji: '🤮', name: 'face vomiting', keywords: ['sick', 'vomit', 'gross', 'puke'], category: 'smileys' },
  { emoji: '🤧', name: 'sneezing face', keywords: ['sneeze', 'sick', 'cold'], category: 'smileys' },
  { emoji: '🥵', name: 'hot face', keywords: ['hot', 'heat', 'sweating'], category: 'smileys' },
  { emoji: '🥶', name: 'cold face', keywords: ['cold', 'freezing', 'ice'], category: 'smileys' },
  { emoji: '🤯', name: 'exploding head', keywords: ['mind blown', 'shocked', 'amazed'], category: 'smileys' },
  { emoji: '🤠', name: 'cowboy hat face', keywords: ['cowboy', 'western', 'yeehaw'], category: 'smileys' },
  { emoji: '🥸', name: 'disguised face', keywords: ['disguise', 'incognito', 'spy'], category: 'smileys' },
  { emoji: '😈', name: 'smiling face with horns', keywords: ['devil', 'evil', 'mischief'], category: 'smileys' },
  { emoji: '👿', name: 'angry face with horns', keywords: ['devil', 'angry', 'evil'], category: 'smileys' },
  { emoji: '💀', name: 'skull', keywords: ['death', 'dead', 'skeleton'], category: 'smileys' },
  { emoji: '👻', name: 'ghost', keywords: ['ghost', 'halloween', 'boo'], category: 'smileys' },
  
  // Gestures & People
  { emoji: '👋', name: 'waving hand', keywords: ['wave', 'hello', 'bye', 'hi'], category: 'people' },
  { emoji: '🤚', name: 'raised back of hand', keywords: ['hand', 'stop'], category: 'people' },
  { emoji: '✋', name: 'raised hand', keywords: ['hand', 'stop', 'high five'], category: 'people' },
  { emoji: '🖐️', name: 'hand with fingers splayed', keywords: ['hand', 'five'], category: 'people' },
  { emoji: '👌', name: 'ok hand', keywords: ['ok', 'perfect', 'good'], category: 'people' },
  { emoji: '🤌', name: 'pinched fingers', keywords: ['italian', 'what', 'chef'], category: 'people' },
  { emoji: '✌️', name: 'victory hand', keywords: ['peace', 'victory', 'v'], category: 'people' },
  { emoji: '🤞', name: 'crossed fingers', keywords: ['luck', 'fingers crossed', 'hope'], category: 'people' },
  { emoji: '🤟', name: 'love-you gesture', keywords: ['love', 'rock', 'ily'], category: 'people' },
  { emoji: '🤘', name: 'sign of the horns', keywords: ['rock', 'metal', 'horns'], category: 'people' },
  { emoji: '👍', name: 'thumbs up', keywords: ['like', 'good', 'ok', 'yes', 'approve'], category: 'people' },
  { emoji: '👎', name: 'thumbs down', keywords: ['dislike', 'bad', 'no', 'disapprove'], category: 'people' },
  { emoji: '✊', name: 'raised fist', keywords: ['fist', 'power', 'solidarity'], category: 'people' },
  { emoji: '👊', name: 'oncoming fist', keywords: ['punch', 'fist bump'], category: 'people' },
  { emoji: '🤛', name: 'left-facing fist', keywords: ['fist bump', 'punch'], category: 'people' },
  { emoji: '🤜', name: 'right-facing fist', keywords: ['fist bump', 'punch'], category: 'people' },
  { emoji: '👏', name: 'clapping hands', keywords: ['clap', 'applause', 'bravo'], category: 'people' },
  { emoji: '🙌', name: 'raising hands', keywords: ['celebrate', 'hooray', 'yay'], category: 'people' },
  { emoji: '🤲', name: 'palms up together', keywords: ['prayer', 'please'], category: 'people' },
  { emoji: '🤝', name: 'handshake', keywords: ['deal', 'agreement', 'shake'], category: 'people' },
  { emoji: '🙏', name: 'folded hands', keywords: ['pray', 'please', 'thank you', 'hope'], category: 'people' },
  { emoji: '💪', name: 'flexed biceps', keywords: ['strong', 'muscle', 'flex', 'gym'], category: 'people' },
  { emoji: '🦾', name: 'mechanical arm', keywords: ['robot', 'prosthetic', 'strong'], category: 'people' },
  { emoji: '👀', name: 'eyes', keywords: ['look', 'see', 'watch'], category: 'people' },
  { emoji: '👁️', name: 'eye', keywords: ['look', 'see'], category: 'people' },
  { emoji: '👅', name: 'tongue', keywords: ['taste', 'lick'], category: 'people' },
  { emoji: '💋', name: 'kiss mark', keywords: ['kiss', 'lips', 'love'], category: 'people' },
  
  // Hearts & Love
  { emoji: '❤️', name: 'red heart', keywords: ['love', 'heart', 'like'], category: 'symbols' },
  { emoji: '🧡', name: 'orange heart', keywords: ['love', 'heart', 'orange'], category: 'symbols' },
  { emoji: '💛', name: 'yellow heart', keywords: ['love', 'heart', 'yellow'], category: 'symbols' },
  { emoji: '💚', name: 'green heart', keywords: ['love', 'heart', 'green'], category: 'symbols' },
  { emoji: '💙', name: 'blue heart', keywords: ['love', 'heart', 'blue'], category: 'symbols' },
  { emoji: '💜', name: 'purple heart', keywords: ['love', 'heart', 'purple'], category: 'symbols' },
  { emoji: '🖤', name: 'black heart', keywords: ['love', 'heart', 'black'], category: 'symbols' },
  { emoji: '🤍', name: 'white heart', keywords: ['love', 'heart', 'white'], category: 'symbols' },
  { emoji: '💔', name: 'broken heart', keywords: ['heartbreak', 'sad', 'broken'], category: 'symbols' },
  { emoji: '💕', name: 'two hearts', keywords: ['love', 'hearts'], category: 'symbols' },
  { emoji: '💖', name: 'sparkling heart', keywords: ['love', 'heart', 'sparkle'], category: 'symbols' },
  { emoji: '💗', name: 'growing heart', keywords: ['love', 'heart', 'growing'], category: 'symbols' },
  { emoji: '💘', name: 'heart with arrow', keywords: ['love', 'cupid', 'valentine'], category: 'symbols' },
  { emoji: '💝', name: 'heart with ribbon', keywords: ['love', 'gift', 'valentine'], category: 'symbols' },
  { emoji: '🔥', name: 'fire', keywords: ['fire', 'hot', 'lit', 'flame'], category: 'symbols' },
  { emoji: '✨', name: 'sparkles', keywords: ['sparkle', 'magic', 'shine', 'star'], category: 'symbols' },
  { emoji: '⭐', name: 'star', keywords: ['star', 'favorite', 'gold'], category: 'symbols' },
  { emoji: '🌟', name: 'glowing star', keywords: ['star', 'shine', 'awesome'], category: 'symbols' },
  { emoji: '💯', name: 'hundred points', keywords: ['100', 'perfect', 'score'], category: 'symbols' },
  
  // Animals
  { emoji: '🐶', name: 'dog face', keywords: ['dog', 'puppy', 'pet'], category: 'animals' },
  { emoji: '🐱', name: 'cat face', keywords: ['cat', 'kitten', 'pet'], category: 'animals' },
  { emoji: '🐭', name: 'mouse face', keywords: ['mouse', 'rat'], category: 'animals' },
  { emoji: '🐰', name: 'rabbit face', keywords: ['rabbit', 'bunny'], category: 'animals' },
  { emoji: '🦊', name: 'fox', keywords: ['fox', 'animal'], category: 'animals' },
  { emoji: '🐻', name: 'bear', keywords: ['bear', 'teddy'], category: 'animals' },
  { emoji: '🐼', name: 'panda', keywords: ['panda', 'bear'], category: 'animals' },
  { emoji: '🐨', name: 'koala', keywords: ['koala', 'australia'], category: 'animals' },
  { emoji: '🦁', name: 'lion', keywords: ['lion', 'king'], category: 'animals' },
  { emoji: '🐮', name: 'cow face', keywords: ['cow', 'moo'], category: 'animals' },
  { emoji: '🐷', name: 'pig face', keywords: ['pig', 'oink'], category: 'animals' },
  { emoji: '🐸', name: 'frog', keywords: ['frog', 'toad'], category: 'animals' },
  { emoji: '🐵', name: 'monkey face', keywords: ['monkey', 'ape'], category: 'animals' },
  { emoji: '🙈', name: 'see-no-evil monkey', keywords: ['monkey', 'hide', 'shy'], category: 'animals' },
  { emoji: '🙉', name: 'hear-no-evil monkey', keywords: ['monkey', 'deaf', 'ignore'], category: 'animals' },
  { emoji: '🙊', name: 'speak-no-evil monkey', keywords: ['monkey', 'quiet', 'secret'], category: 'animals' },
  { emoji: '🐔', name: 'chicken', keywords: ['chicken', 'hen'], category: 'animals' },
  { emoji: '🦆', name: 'duck', keywords: ['duck', 'quack'], category: 'animals' },
  { emoji: '🦅', name: 'eagle', keywords: ['eagle', 'bird'], category: 'animals' },
  { emoji: '🦉', name: 'owl', keywords: ['owl', 'wisdom'], category: 'animals' },
  { emoji: '🦇', name: 'bat', keywords: ['bat', 'vampire'], category: 'animals' },
  { emoji: '🐺', name: 'wolf', keywords: ['wolf', 'howl'], category: 'animals' },
  { emoji: '🐝', name: 'honeybee', keywords: ['bee', 'honey', 'buzz'], category: 'animals' },
  { emoji: '🦋', name: 'butterfly', keywords: ['butterfly', 'insect'], category: 'animals' },
  { emoji: '🐌', name: 'snail', keywords: ['snail', 'slow'], category: 'animals' },
  { emoji: '🐙', name: 'octopus', keywords: ['octopus', 'sea'], category: 'animals' },
  { emoji: '🦈', name: 'shark', keywords: ['shark', 'fish'], category: 'animals' },
  { emoji: '🐳', name: 'spouting whale', keywords: ['whale', 'ocean'], category: 'animals' },
  { emoji: '🐬', name: 'dolphin', keywords: ['dolphin', 'flipper'], category: 'animals' },
  { emoji: '🦄', name: 'unicorn', keywords: ['unicorn', 'magic', 'fantasy'], category: 'animals' },
  
  // Food & Drink
  { emoji: '🍕', name: 'pizza', keywords: ['pizza', 'food', 'slice'], category: 'food' },
  { emoji: '🍔', name: 'hamburger', keywords: ['burger', 'food', 'fastfood'], category: 'food' },
  { emoji: '🍟', name: 'french fries', keywords: ['fries', 'food', 'fastfood'], category: 'food' },
  { emoji: '🌭', name: 'hot dog', keywords: ['hotdog', 'food', 'sausage'], category: 'food' },
  { emoji: '🍿', name: 'popcorn', keywords: ['popcorn', 'movie', 'snack'], category: 'food' },
  { emoji: '🍩', name: 'doughnut', keywords: ['donut', 'dessert', 'sweet'], category: 'food' },
  { emoji: '🍪', name: 'cookie', keywords: ['cookie', 'dessert', 'sweet'], category: 'food' },
  { emoji: '🎂', name: 'birthday cake', keywords: ['cake', 'birthday', 'party'], category: 'food' },
  { emoji: '🍰', name: 'shortcake', keywords: ['cake', 'dessert', 'sweet'], category: 'food' },
  { emoji: '🍫', name: 'chocolate bar', keywords: ['chocolate', 'candy', 'sweet'], category: 'food' },
  { emoji: '🍬', name: 'candy', keywords: ['candy', 'sweet'], category: 'food' },
  { emoji: '🍭', name: 'lollipop', keywords: ['lollipop', 'candy', 'sweet'], category: 'food' },
  { emoji: '☕', name: 'hot beverage', keywords: ['coffee', 'tea', 'hot'], category: 'food' },
  { emoji: '🍵', name: 'teacup without handle', keywords: ['tea', 'green tea'], category: 'food' },
  { emoji: '🍺', name: 'beer mug', keywords: ['beer', 'drink', 'alcohol'], category: 'food' },
  { emoji: '🍻', name: 'clinking beer mugs', keywords: ['beer', 'cheers', 'toast'], category: 'food' },
  { emoji: '🥂', name: 'clinking glasses', keywords: ['champagne', 'cheers', 'toast'], category: 'food' },
  { emoji: '🍷', name: 'wine glass', keywords: ['wine', 'drink', 'alcohol'], category: 'food' },
  { emoji: '🍹', name: 'tropical drink', keywords: ['cocktail', 'drink', 'vacation'], category: 'food' },
  { emoji: '🧃', name: 'beverage box', keywords: ['juice box', 'drink'], category: 'food' },
  { emoji: '🍎', name: 'red apple', keywords: ['apple', 'fruit'], category: 'food' },
  { emoji: '🍌', name: 'banana', keywords: ['banana', 'fruit'], category: 'food' },
  { emoji: '🍇', name: 'grapes', keywords: ['grapes', 'fruit'], category: 'food' },
  { emoji: '🍓', name: 'strawberry', keywords: ['strawberry', 'fruit'], category: 'food' },
  { emoji: '🥑', name: 'avocado', keywords: ['avocado', 'guacamole'], category: 'food' },
  { emoji: '🌶️', name: 'hot pepper', keywords: ['pepper', 'spicy', 'hot'], category: 'food' },
  { emoji: '🍳', name: 'cooking', keywords: ['egg', 'breakfast', 'fry'], category: 'food' },
  { emoji: '🥓', name: 'bacon', keywords: ['bacon', 'breakfast', 'meat'], category: 'food' },
  
  // Activities & Sports
  { emoji: '⚽', name: 'soccer ball', keywords: ['soccer', 'football', 'sport'], category: 'activities' },
  { emoji: '🏀', name: 'basketball', keywords: ['basketball', 'sport'], category: 'activities' },
  { emoji: '🏈', name: 'american football', keywords: ['football', 'sport'], category: 'activities' },
  { emoji: '⚾', name: 'baseball', keywords: ['baseball', 'sport'], category: 'activities' },
  { emoji: '🎾', name: 'tennis', keywords: ['tennis', 'sport', 'ball'], category: 'activities' },
  { emoji: '🏐', name: 'volleyball', keywords: ['volleyball', 'sport'], category: 'activities' },
  { emoji: '🎮', name: 'video game', keywords: ['game', 'gaming', 'controller'], category: 'activities' },
  { emoji: '🎲', name: 'game die', keywords: ['dice', 'game', 'gambling'], category: 'activities' },
  { emoji: '🎯', name: 'direct hit', keywords: ['target', 'bullseye', 'dart'], category: 'activities' },
  { emoji: '🎳', name: 'bowling', keywords: ['bowling', 'sport'], category: 'activities' },
  { emoji: '🎸', name: 'guitar', keywords: ['guitar', 'music', 'rock'], category: 'activities' },
  { emoji: '🎹', name: 'musical keyboard', keywords: ['piano', 'music', 'keyboard'], category: 'activities' },
  { emoji: '🎤', name: 'microphone', keywords: ['karaoke', 'sing', 'mic'], category: 'activities' },
  { emoji: '🎬', name: 'clapper board', keywords: ['movie', 'film', 'action'], category: 'activities' },
  { emoji: '🎨', name: 'artist palette', keywords: ['art', 'paint', 'creative'], category: 'activities' },
  { emoji: '🏆', name: 'trophy', keywords: ['trophy', 'winner', 'champion'], category: 'activities' },
  { emoji: '🥇', name: 'gold medal', keywords: ['medal', 'first', 'gold', 'winner'], category: 'activities' },
  { emoji: '🥈', name: 'silver medal', keywords: ['medal', 'second', 'silver'], category: 'activities' },
  { emoji: '🥉', name: 'bronze medal', keywords: ['medal', 'third', 'bronze'], category: 'activities' },
  
  // Travel & Places
  { emoji: '🚗', name: 'car', keywords: ['car', 'drive', 'automobile'], category: 'travel' },
  { emoji: '🚕', name: 'taxi', keywords: ['taxi', 'cab', 'car'], category: 'travel' },
  { emoji: '🚌', name: 'bus', keywords: ['bus', 'transit', 'public'], category: 'travel' },
  { emoji: '🚎', name: 'trolleybus', keywords: ['bus', 'trolley'], category: 'travel' },
  { emoji: '🚀', name: 'rocket', keywords: ['rocket', 'space', 'launch'], category: 'travel' },
  { emoji: '✈️', name: 'airplane', keywords: ['airplane', 'flight', 'travel'], category: 'travel' },
  { emoji: '🛸', name: 'flying saucer', keywords: ['ufo', 'alien', 'space'], category: 'travel' },
  { emoji: '🚁', name: 'helicopter', keywords: ['helicopter', 'chopper', 'fly'], category: 'travel' },
  { emoji: '🚢', name: 'ship', keywords: ['ship', 'boat', 'cruise'], category: 'travel' },
  { emoji: '⛵', name: 'sailboat', keywords: ['sailboat', 'sail', 'boat'], category: 'travel' },
  { emoji: '🏠', name: 'house', keywords: ['house', 'home'], category: 'travel' },
  { emoji: '🏢', name: 'office building', keywords: ['office', 'building', 'work'], category: 'travel' },
  { emoji: '🏥', name: 'hospital', keywords: ['hospital', 'medical', 'health'], category: 'travel' },
  { emoji: '🏫', name: 'school', keywords: ['school', 'education'], category: 'travel' },
  { emoji: '⛰️', name: 'mountain', keywords: ['mountain', 'nature', 'hiking'], category: 'travel' },
  { emoji: '🏖️', name: 'beach with umbrella', keywords: ['beach', 'vacation', 'summer'], category: 'travel' },
  { emoji: '🌅', name: 'sunrise', keywords: ['sunrise', 'morning', 'sun'], category: 'travel' },
  { emoji: '🌄', name: 'sunrise over mountains', keywords: ['sunrise', 'mountain', 'morning'], category: 'travel' },
  { emoji: '🌈', name: 'rainbow', keywords: ['rainbow', 'colorful'], category: 'travel' },
  { emoji: '🌙', name: 'crescent moon', keywords: ['moon', 'night', 'sleep'], category: 'travel' },
  { emoji: '⭐', name: 'star', keywords: ['star', 'night', 'sky'], category: 'travel' },
  { emoji: '☀️', name: 'sun', keywords: ['sun', 'sunny', 'weather'], category: 'travel' },
  { emoji: '🌤️', name: 'sun behind small cloud', keywords: ['weather', 'partly cloudy'], category: 'travel' },
  { emoji: '⛈️', name: 'cloud with lightning and rain', keywords: ['storm', 'thunder', 'weather'], category: 'travel' },
  { emoji: '❄️', name: 'snowflake', keywords: ['snow', 'winter', 'cold'], category: 'travel' },
  
  // Objects
  { emoji: '💻', name: 'laptop', keywords: ['computer', 'laptop', 'work'], category: 'objects' },
  { emoji: '🖥️', name: 'desktop computer', keywords: ['computer', 'desktop', 'pc'], category: 'objects' },
  { emoji: '📱', name: 'mobile phone', keywords: ['phone', 'mobile', 'smartphone'], category: 'objects' },
  { emoji: '📷', name: 'camera', keywords: ['camera', 'photo', 'picture'], category: 'objects' },
  { emoji: '📹', name: 'video camera', keywords: ['video', 'camera', 'film'], category: 'objects' },
  { emoji: '🎥', name: 'movie camera', keywords: ['movie', 'camera', 'film'], category: 'objects' },
  { emoji: '📺', name: 'television', keywords: ['tv', 'television', 'watch'], category: 'objects' },
  { emoji: '🔊', name: 'speaker high volume', keywords: ['sound', 'speaker', 'loud'], category: 'objects' },
  { emoji: '🔇', name: 'speaker muted', keywords: ['mute', 'quiet', 'silent'], category: 'objects' },
  { emoji: '🔔', name: 'bell', keywords: ['bell', 'notification', 'alert'], category: 'objects' },
  { emoji: '📧', name: 'e-mail', keywords: ['email', 'mail', 'message'], category: 'objects' },
  { emoji: '📝', name: 'memo', keywords: ['note', 'memo', 'write'], category: 'objects' },
  { emoji: '📚', name: 'books', keywords: ['books', 'read', 'study'], category: 'objects' },
  { emoji: '📖', name: 'open book', keywords: ['book', 'read'], category: 'objects' },
  { emoji: '🔑', name: 'key', keywords: ['key', 'lock', 'password'], category: 'objects' },
  { emoji: '🔒', name: 'locked', keywords: ['lock', 'secure', 'private'], category: 'objects' },
  { emoji: '🔓', name: 'unlocked', keywords: ['unlock', 'open'], category: 'objects' },
  { emoji: '💡', name: 'light bulb', keywords: ['idea', 'light', 'bulb'], category: 'objects' },
  { emoji: '🔧', name: 'wrench', keywords: ['tool', 'wrench', 'fix'], category: 'objects' },
  { emoji: '🔨', name: 'hammer', keywords: ['tool', 'hammer', 'build'], category: 'objects' },
  { emoji: '⚙️', name: 'gear', keywords: ['settings', 'gear', 'config'], category: 'objects' },
  { emoji: '💎', name: 'gem stone', keywords: ['diamond', 'gem', 'jewel'], category: 'objects' },
  { emoji: '💰', name: 'money bag', keywords: ['money', 'rich', 'dollar'], category: 'objects' },
  { emoji: '💵', name: 'dollar banknote', keywords: ['money', 'dollar', 'cash'], category: 'objects' },
  { emoji: '🎁', name: 'wrapped gift', keywords: ['gift', 'present', 'birthday'], category: 'objects' },
  { emoji: '🎀', name: 'ribbon', keywords: ['ribbon', 'bow', 'gift'], category: 'objects' },
  { emoji: '🎈', name: 'balloon', keywords: ['balloon', 'party', 'birthday'], category: 'objects' },
  { emoji: '🎉', name: 'party popper', keywords: ['party', 'celebrate', 'confetti'], category: 'objects' },
  { emoji: '🎊', name: 'confetti ball', keywords: ['confetti', 'party', 'celebrate'], category: 'objects' },
  
  // Flags
  { emoji: '🏳️', name: 'white flag', keywords: ['surrender', 'peace'], category: 'flags' },
  { emoji: '🏴', name: 'black flag', keywords: ['flag', 'pirate'], category: 'flags' },
  { emoji: '🏁', name: 'chequered flag', keywords: ['race', 'finish', 'checkered'], category: 'flags' },
  { emoji: '🚩', name: 'triangular flag', keywords: ['flag', 'warning', 'red flag'], category: 'flags' },
  { emoji: '🇺🇸', name: 'flag: United States', keywords: ['usa', 'america', 'flag'], category: 'flags' },
  { emoji: '🇬🇧', name: 'flag: United Kingdom', keywords: ['uk', 'britain', 'flag'], category: 'flags' },
  { emoji: '🇨🇦', name: 'flag: Canada', keywords: ['canada', 'flag'], category: 'flags' },
  { emoji: '🇦🇺', name: 'flag: Australia', keywords: ['australia', 'flag'], category: 'flags' },
  { emoji: '🇩🇪', name: 'flag: Germany', keywords: ['germany', 'flag'], category: 'flags' },
  { emoji: '🇫🇷', name: 'flag: France', keywords: ['france', 'flag'], category: 'flags' },
  { emoji: '🇯🇵', name: 'flag: Japan', keywords: ['japan', 'flag'], category: 'flags' },
  { emoji: '🇰🇷', name: 'flag: South Korea', keywords: ['korea', 'flag'], category: 'flags' },
  { emoji: '🇨🇳', name: 'flag: China', keywords: ['china', 'flag'], category: 'flags' },
  { emoji: '🇮🇳', name: 'flag: India', keywords: ['india', 'flag'], category: 'flags' },
  { emoji: '🇧🇷', name: 'flag: Brazil', keywords: ['brazil', 'flag'], category: 'flags' },
  { emoji: '🇲🇽', name: 'flag: Mexico', keywords: ['mexico', 'flag'], category: 'flags' },
  { emoji: '🇪🇸', name: 'flag: Spain', keywords: ['spain', 'flag'], category: 'flags' },
  { emoji: '🇮🇹', name: 'flag: Italy', keywords: ['italy', 'flag'], category: 'flags' },
  { emoji: '🇳🇱', name: 'flag: Netherlands', keywords: ['netherlands', 'holland', 'flag'], category: 'flags' },
  { emoji: '🇸🇪', name: 'flag: Sweden', keywords: ['sweden', 'flag'], category: 'flags' },
];

// State
let recentEmojis: string[] = [];
let favorites: string[] = [];

/**
 * Initialize plugin
 */
export function init(): void {
  try {
    const savedRecents = hostGetConfig('recentEmojis');
    const savedFavorites = hostGetConfig('favorites');
    
    if (savedRecents) recentEmojis = JSON.parse(savedRecents);
    if (savedFavorites) favorites = JSON.parse(savedFavorites);
  } catch (e) {
    // Ignore
  }
  
  hostLog('info', 'Emoji Picker plugin initialized');
}

/**
 * Save state
 */
function saveState(): void {
  try {
    hostSetConfig('recentEmojis', JSON.stringify(recentEmojis));
    hostSetConfig('favorites', JSON.stringify(favorites));
  } catch (e) {
    // Ignore
  }
}

/**
 * Add to recent emojis
 */
function addToRecent(emoji: string): void {
  recentEmojis = [emoji, ...recentEmojis.filter(e => e !== emoji)].slice(0, 20);
  saveState();
}

/**
 * Search handler
 */
export function search(): string {
  const inputJson = Host.inputString();
  const input: SearchInput = JSON.parse(inputJson);
  const query = input.query.toLowerCase().trim();
  
  let results: SearchResult[] = [];
  
  // If no query, show recent and favorites
  if (!query) {
    // Show favorites first
    if (favorites.length > 0) {
      const favoriteEmojis = EMOJIS.filter(e => favorites.includes(e.emoji));
      results.push(...favoriteEmojis.slice(0, 10).map((emoji, i) => ({
        id: `fav-${emoji.emoji}`,
        title: emoji.emoji,
        subtitle: `⭐ ${emoji.name}`,
        icon: emoji.emoji,
        score: 200 - i,
        category: 'Favorites',
        action: { type: 'copy' as const, value: emoji.emoji },
      })));
    }
    
    // Then recent
    if (recentEmojis.length > 0) {
      const recentEmojiData = recentEmojis
        .map(e => EMOJIS.find(emoji => emoji.emoji === e))
        .filter(Boolean) as Emoji[];
      
      results.push(...recentEmojiData.slice(0, 10).map((emoji, i) => ({
        id: `recent-${emoji.emoji}`,
        title: emoji.emoji,
        subtitle: `🕐 ${emoji.name}`,
        icon: emoji.emoji,
        score: 100 - i,
        category: 'Recent',
        action: { type: 'copy' as const, value: emoji.emoji },
      })));
    }
    
    // If nothing, show popular
    if (results.length === 0) {
      const popular = ['😀', '❤️', '👍', '😂', '🎉', '🔥', '✨', '🙏', '💪', '👀'];
      const popularEmojis = popular
        .map(e => EMOJIS.find(emoji => emoji.emoji === e))
        .filter(Boolean) as Emoji[];
      
      results.push(...popularEmojis.map((emoji, i) => ({
        id: `popular-${emoji.emoji}`,
        title: emoji.emoji,
        subtitle: emoji.name,
        icon: emoji.emoji,
        score: 100 - i,
        category: 'Popular',
        action: { type: 'copy' as const, value: emoji.emoji },
      })));
    }
  } else {
    // Search emojis
    const matches = EMOJIS.filter(emoji => 
      emoji.name.includes(query) ||
      emoji.keywords.some(k => k.includes(query)) ||
      emoji.emoji === query
    );
    
    results = matches.slice(0, 30).map((emoji, i) => ({
      id: `search-${emoji.emoji}`,
      title: emoji.emoji,
      subtitle: emoji.name,
      icon: emoji.emoji,
      score: 100 - i,
      category: emoji.category.charAt(0).toUpperCase() + emoji.category.slice(1),
      action: { type: 'copy' as const, value: emoji.emoji },
    }));
    
    if (results.length === 0) {
      results.push({
        id: 'no-results',
        title: `No emojis found for "${query}"`,
        subtitle: 'Try different keywords',
        icon: '🔍',
        score: 1,
        category: 'Emoji',
      });
    }
  }
  
  const output: SearchOutput = { results };
  return JSON.stringify(output);
}

/**
 * Execute action (toggle favorite)
 */
export function execute(): string {
  const inputJson = Host.inputString();
  const input = JSON.parse(inputJson);
  
  if (input.action === 'favorite_emoji' && input.emoji) {
    const emoji = input.emoji as string;
    if (favorites.includes(emoji)) {
      favorites = favorites.filter(e => e !== emoji);
    } else {
      favorites = [emoji, ...favorites].slice(0, 50);
    }
    saveState();
    return JSON.stringify({ success: true, isFavorite: favorites.includes(emoji) });
  }
  
  // Track usage when emoji is copied
  if (input.emoji) {
    addToRecent(input.emoji);
  }
  
  return JSON.stringify({ success: true });
}

/**
 * AI Tool handler
 */
export function ai_tool(): string {
  const inputJson = Host.inputString();
  const input: AIToolInput = JSON.parse(inputJson);
  
  if (input.tool === 'find_emoji') {
    const query = (input.arguments.query as string || '').toLowerCase();
    const limit = (input.arguments.limit as number) || 5;
    
    const matches = EMOJIS.filter(emoji =>
      emoji.name.includes(query) ||
      emoji.keywords.some(k => k.includes(query))
    ).slice(0, limit);
    
    return JSON.stringify({
      result: JSON.stringify({
        query,
        emojis: matches.map(e => ({ emoji: e.emoji, name: e.name })),
      }),
      isError: false,
    });
  }
  
  if (input.tool === 'get_emoji_by_category') {
    const category = (input.arguments.category as string || '').toLowerCase();
    const limit = (input.arguments.limit as number) || 10;
    
    const categoryEmojis = EMOJIS
      .filter(e => e.category === category)
      .slice(0, limit);
    
    return JSON.stringify({
      result: JSON.stringify({
        category,
        emojis: categoryEmojis.map(e => ({ emoji: e.emoji, name: e.name })),
      }),
      isError: false,
    });
  }
  
  return JSON.stringify({ result: 'Unknown tool', isError: true });
}

/**
 * Shutdown
 */
export function shutdown(): void {
  saveState();
  hostLog('info', 'Emoji Picker plugin shutting down');
}

