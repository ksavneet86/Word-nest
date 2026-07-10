import {
  BookOpen, SpellCheck2, GraduationCap, Shuffle,
} from "lucide-react";

export const SECTIONS = {
  vocab: { label: "Vocabulary", icon: BookOpen, color: "#FF7A59", soft: "#FFE8E1" },
  spelling: { label: "Spellings", icon: SpellCheck2, color: "#4ECDC4", soft: "#E3F8F6" },
  elevenPlus: { label: "11+ Vocabulary", icon: GraduationCap, color: "#7C6FF0", soft: "#ECEAFD" },
  synAnt: { label: "Synonyms & Antonyms", icon: Shuffle, color: "#F0A63A", soft: "#FDF0DD" },
} as const;

export type SectionKey = keyof typeof SECTIONS;

export const EMOJI_FALLBACK = "📘";

export interface LearnerSettings {
  reduceMotion: boolean;
  textSize: "sm" | "md" | "lg" | "xl";
  dyslexiaFont: boolean;
  speechRate: number;
  soundEnabled: boolean;
  firstThenEnabled: boolean;
  errorlessMode: boolean;
}

export const SETTINGS_DEFAULTS: LearnerSettings = {
  reduceMotion: false,
  textSize: "md",
  dyslexiaFont: false,
  speechRate: 0.85,
  soundEnabled: true,
  firstThenEnabled: false,
  errorlessMode: false,
};

export const ZOOM_LEVELS: Record<LearnerSettings["textSize"], number> = {
  sm: 0.875,
  md: 1,
  lg: 1.125,
  xl: 1.25,
};

export const POS_COLORS: Record<string, string> = {
  noun: "#4ECDC4", verb: "#FF7A59", adjective: "#7C6FF0", adverb: "#F0A63A",
  pronoun: "#57B894", preposition: "#E56399", conjunction: "#8FA6CB", interjection: "#F4B942",
};

export const ELEVEN_PLUS_WORDS: Array<
  [word: string, meaning: string, pos: string, synonyms: string[], antonyms: string[], sentenceTip: string, emoji: string]
> = [
  ["abundant", "existing in large quantities; plentiful", "adjective", ["plentiful", "ample", "copious"], ["scarce", "sparse"], "There was an abundant supply of food at the festival.", "🌾"],
  ["benevolent", "kind and generous", "adjective", ["kind", "generous", "charitable"], ["cruel", "malicious"], "The benevolent king gave gifts to the poor.", "🤝"],
  ["candid", "truthful and straightforward; frank", "adjective", ["frank", "honest", "open"], ["deceptive", "evasive"], "She gave a candid answer to the tricky question.", "🗣️"],
  ["diligent", "showing care and effort in work", "adjective", ["hardworking", "industrious", "conscientious"], ["lazy", "careless"], "The diligent student finished her homework early.", "📚"],
  ["eloquent", "fluent and persuasive in speaking", "adjective", ["articulate", "expressive", "fluent"], ["inarticulate", "awkward"], "The eloquent speaker moved the whole crowd.", "🎤"],
  ["frivolous", "not having any serious purpose", "adjective", ["silly", "trivial", "petty"], ["serious", "sensible"], "He wasted money on frivolous purchases.", "🎈"],
  ["gregarious", "fond of company; sociable", "adjective", ["sociable", "outgoing", "friendly"], ["shy", "reserved"], "The gregarious puppy greeted every visitor.", "🐶"],
  ["hostile", "unfriendly; showing dislike", "adjective", ["unfriendly", "aggressive", "antagonistic"], ["friendly", "welcoming"], "The two rivals gave each other hostile looks.", "⚡"],
  ["immense", "extremely large", "adjective", ["enormous", "huge", "vast"], ["tiny", "minute"], "The immense mountain towered over the village.", "🏔️"],
  ["jubilant", "feeling great happiness and triumph", "adjective", ["overjoyed", "elated", "delighted"], ["sad", "dejected"], "The team was jubilant after winning the cup.", "🎉"],
  ["keen", "having enthusiasm or interest", "adjective", ["eager", "enthusiastic", "avid"], ["indifferent", "reluctant"], "She was keen to start her new project.", "✨"],
  ["lament", "to express sorrow or regret", "verb", ["mourn", "grieve", "bewail"], ["celebrate", "rejoice"], "They lamented the loss of the old oak tree.", "😢"],
  ["meticulous", "showing great attention to detail", "adjective", ["careful", "precise", "thorough"], ["careless", "sloppy"], "The meticulous artist checked every brushstroke.", "🔍"],
  ["notorious", "famous for something bad", "adjective", ["infamous", "disreputable"], ["esteemed", "respected"], "The pirate was notorious across the seven seas.", "🏴‍☠️"],
  ["obstinate", "stubbornly refusing to change", "adjective", ["stubborn", "headstrong", "inflexible"], ["flexible", "yielding"], "The obstinate mule would not move an inch.", "🐴"],
  ["persevere", "to continue despite difficulty", "verb", ["persist", "endure", "carry on"], ["give up", "quit"], "She persevered through every obstacle in the race.", "🏃"],
  ["quaint", "attractively unusual or old-fashioned", "adjective", ["charming", "picturesque"], ["modern", "ordinary"], "They stayed in a quaint little cottage.", "🏡"],
  ["reluctant", "unwilling and hesitant", "adjective", ["hesitant", "unwilling", "loath"], ["eager", "willing"], "He was reluctant to try the spicy food.", "🤔"],
  ["scarce", "insufficient for demand; rare", "adjective", ["rare", "sparse", "limited"], ["abundant", "plentiful"], "Clean water was scarce during the drought.", "💧"],
  ["tedious", "too long, slow, or dull", "adjective", ["boring", "monotonous", "dreary"], ["exciting", "interesting"], "Filling in the long form was tedious.", "😴"],
  ["unanimous", "fully in agreement", "adjective", ["united", "concordant"], ["divided", "split"], "The vote was unanimous in favour of the trip.", "🙌"],
  ["vivid", "producing powerful, clear images", "adjective", ["bright", "vibrant", "graphic"], ["dull", "faded"], "She painted a vivid picture of the sunset.", "🎨"],
  ["wary", "cautious about possible danger", "adjective", ["cautious", "careful", "guarded"], ["careless", "trusting"], "The deer stayed wary near the open field.", "🦌"],
  ["zealous", "showing great energy for a cause", "adjective", ["passionate", "fervent", "enthusiastic"], ["apathetic", "indifferent"], "The zealous volunteers cleaned the whole beach.", "🔥"],
  ["ambiguous", "open to more than one interpretation", "adjective", ["unclear", "vague", "equivocal"], ["clear", "explicit"], "His ambiguous answer left everyone confused.", "❓"],
  ["boisterous", "noisy, energetic, and cheerful", "adjective", ["rowdy", "lively", "exuberant"], ["calm", "quiet"], "The boisterous children played in the yard.", "📣"],
  ["cautious", "careful to avoid risk", "adjective", ["careful", "wary", "prudent"], ["reckless", "careless"], "She took a cautious step onto the ice.", "🧊"],
  ["dexterous", "skilled with the hands", "adjective", ["skilful", "nimble", "adroit"], ["clumsy", "awkward"], "The dexterous juggler kept five balls in the air.", "🤹"],
  ["fatigue", "extreme tiredness", "noun", ["exhaustion", "weariness"], ["energy", "vigour"], "Fatigue set in after the long hike.", "🥱"],
  ["genuine", "truly what it is said to be", "adjective", ["authentic", "real", "sincere"], ["fake", "false"], "Her genuine smile put everyone at ease.", "💛"],
];

export const ELEVEN_PLUS_EXTENDED_WORDS = `abandon abrupt absurd accelerate accompany accurate accuse achieve acknowledge acquire adamant adapt adequate adjacent admirable admonish adverse advocate affectionate agile agitate alarming alleviate allocate aloof altruistic amateur ambitious amiable ample amuse ancient animated anguish animosity anonymous antagonise anticipate apathetic apparent appease applaud apprehensive appropriate approximate arbitrary arduous arrogant articulate ascend assemble assert assess astonish astute attentive audacious authentic authoritative avert awe awkward banish barren beckon befriend belligerent bewilder bizarre bland blatant bleak blissful blunder bolster bountiful brazen brittle brood brutal bustling calamity callous capable capricious captivate cascade catastrophe caution cease celestial chaotic charismatic chastise chronic circumvent clamber clandestine clarify clumsy coax coerce coherent coincide collaborate colossal commence commend commotion compassionate compel competent complacent complement comprehend compromise conceal concede conciliate concise condemn condense confide confront congregate conscientious conspicuous constrain contemplate contempt contradict contrive converge convey convince cordial corrode courteous cower crave credible cryptic cumbersome curb curious cynical dainty dauntless dawdle debris deceive decipher decisive defect deficient defy degrade deject delegate deliberate delve demolish denounce deplete deploy deprive deride derive desolate despise despondent destitute deter deteriorate devastate deviate devious devote diminish disclose discreet disdain disgruntled disperse dispute disregard disrupt dissent distinct distinguish distort diverse divulge docile dominant dormant dubious dwindle earnest ecstatic eerie elaborate elated elegant eligible elude emanate embark embellish emerge eminent empathy emphatic enable enchant encounter endeavour endorse endure energetic engross enhance enigma enlighten enrage ensue enthral entice envious ephemeral epitome equanimity eradicate erratic erroneous eschew essential esteem eternal evacuate evade evaluate evasive evident exasperate exceptional excessive exclude exhaust exhilarate exile exotic expand expedite explicit exploit expose extinct extract extravagant exuberant fabricate facilitate faithful falter fanatic fascinate feasible feeble ferocious fervent feud fickle fidgety fierce flamboyant flaunt flee flimsy fluctuate foreboding forfeit formidable fortify fortunate fragile fraught frenzied frugal fundamental furtive futile garble gaunt generate gigantic glisten gloomy glorious gracious gradual grapple grave grievance grim grumble gruesome gullible hamper haphazard harass harbour hasty haughty hazardous heed hesitant hinder hoard humble hurl hypocrite idle ignite illuminate illustrate immerse immune impartial impede imperative impetuous implausible implement implicate implore imposing impoverish impress impromptu impudent inadequate inanimate incentive incessant incite inclined incompatible inconceivable incorporate indecisive indignant indispensable indolent induce inept inevitable infamous infatuated infer infinite infuriate ingenious inhabit inherent inhibit initiate innate innovate inquisitive insatiable insight insignificant insolent inspect instigate instil insulate intact integrate intense intercept interrogate intervene intimidate intricate intrigue intrude invaluable invariable inventive investigate invigorate invincible irate irrational irresistible irritable isolate jeopardise jovial judicious laborious languid lavish legitimate lenient lethal liberate listless lofty lucid ludicrous lurk luxurious magnanimous magnify majestic malicious mandatory manipulate marvel meagre meander meddle mediate melancholy menace mimic miserly mitigate mobilise mock monotonous morose mundane murky myriad naive negligent negotiate nimble nostalgic notable nourish nurture obedient oblige oblivious obscure observant obsolete obstacle obtain occupy offend ominous opaque optimistic opulent orderly ornate ostentatious outrageous overwhelm painstaking paradox paramount passive pathetic peculiar peer penetrate perceive peril perpetual persist pertinent perturb pessimistic petty philanthropic pinnacle placid plausible plentiful plight plummet ponder potent precarious precise predicament preposterous presume prevalent pristine proceed proclaim procrastinate prodigious profound prohibit prolong prominent prompt propel prosper provoke prudent pungent quarrel quell quench quest quibble radiant rampant rancid rapport rash ravenous realm rebellious reckless reconcile refine refute regal rejuvenate relentless relevant reliable relinquish remarkable remorse renowned replenish reprimand resent reserved resilient resolute resourceful respite restrain retaliate reticent retrieve revere revive rigid robust rudimentary rummage ruthless sagacious salvage sanctuary sarcastic satisfy savour sceptical scold scorn scramble scrupulous scrutinise secluded sedate seize sensible sequence serene severe shrewd siege significant simultaneous sinister skirmish slander sluggish sombre sophisticated sparse spontaneous sporadic squander stagnant staunch stealthy stern stifle stoic strenuous striking stringent submissive subside substantial subtle succumb sufficient sullen superficial superfluous suppress surge surmount surpass surplus susceptible suspicious sustain swindle sympathy tactful tangible tarnish temperate tenacious tentative tepid terminate thorough thrifty thrive tirade torment tranquil transient transparent treacherous tremendous trepidation trivial turbulent tyranny ubiquitous ultimatum uncanny unconventional undermine unequivocal unfathomable unruly unscrupulous unveil upheaval urgent usher utilise utmost vacant vague vain valiant vanquish venerable verify versatile vex vibrant vicious vigilant vigorous vindictive virtuous vivacious volatile voracious wander wane wavering weary whimsical wilt wistful withhold wither wrath wretched yearn`
  .split(/\s+/)
  .filter(Boolean);

export function difficultyForWord(word: string): "low" | "moderate" | "high" {
  return word.length <= 6 ? "low" : word.length <= 9 ? "moderate" : "high";
}
