import { CEFRLevel, ReadingPassage, ExamQuestion } from '../../types/exam';

export interface ExamReadingItem {
  passage: ReadingPassage;
  questions: {
    id: string;
    prompt: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
    tags: string[];
    suggestedLessonId?: string;
  }[];
}

export const READING_PASSAGES_BANK: Record<CEFRLevel, ExamReadingItem[]> = {
  A1: [],
  A2: [],
  B1: [
    {
      passage: {
        id: 'read-b1-1',
        level: 'B1',
        title: 'The Changing Habit of Coffee Drinking',
        topic: 'Lifestyle & Society',
        wordCount: 215,
        passage: `Over the last twenty years, coffee has transformed from a simple morning beverage into a global cultural phenomenon. In the past, most households brewed instant coffee or standard drip filter coffee before heading off to work. Today, however, specialized coffee shops can be found on almost every street corner in major cities worldwide.

This change is largely driven by younger consumers who view coffee shops not merely as places to purchase a hot drink, but as third spaces—comfortable environments between home and the workplace where people can study, meet friends, or work remotely on their laptops. Modern cafes offer extensive menus featuring espresso variations, plant-based milk options, and single-origin beans from different continents.

Furthermore, environmental awareness is influencing how coffee is produced and sold. Many customers now prefer cafes that use fair-trade certified beans and provide discounts for bringing reusable cups. Although specialty drinks often cost significantly more than traditional coffee, consumers appear willing to pay extra for quality, atmosphere, and ethical business practices.`,
      },
      questions: [
        {
          id: 'read-b1-1-q1',
          prompt: 'According to the first paragraph, how has coffee drinking changed in the last two decades?',
          options: [
            'People only drink coffee at their workplace now.',
            'It has evolved from a simple drink into a widespread social culture.',
            'Instant coffee has completely disappeared from homes.',
            'Specialized coffee shops are only located in Europe.',
          ],
          correctAnswer: 'It has evolved from a simple drink into a widespread social culture.',
          explanation: 'Paragraph 1 states that coffee transformed from a simple morning beverage into a global cultural phenomenon.',
          tags: ['reading', 'main-idea', 'lifestyle'],
          suggestedLessonId: 'food',
        },
        {
          id: 'read-b1-1-q2',
          prompt: 'What does the term "third spaces" refer to in paragraph 2?',
          options: [
            'Places between home and work where people study, socialize, or work.',
            'Outdoor areas where coffee beans are cultivated.',
            'Offices that provide free espresso machines for employees.',
            'Small cafes located on the third floor of office buildings.',
          ],
          correctAnswer: 'Places between home and work where people study, socialize, or work.',
          explanation: 'Paragraph 2 explicitly defines third spaces as "comfortable environments between home and the workplace where people can study, meet friends, or work remotely".',
          tags: ['reading', 'detail', 'vocabulary'],
          suggestedLessonId: 'daily-routine',
        },
        {
          id: 'read-b1-1-q3',
          prompt: 'Why are many modern customers willing to pay higher prices for specialty coffee?',
          options: [
            'Because standard drip filter coffee is no longer sold anywhere.',
            'Because they value high quality, ambiance, and ethical practices.',
            'Because coffee shops now offer free laptops to use.',
            'Because governments have introduced high taxes on regular coffee.',
          ],
          correctAnswer: 'Because they value high quality, ambiance, and ethical practices.',
          explanation: 'The final sentence mentions consumers are "willing to pay extra for quality, atmosphere, and ethical business practices".',
          tags: ['reading', 'inference', 'society'],
          suggestedLessonId: 'shopping',
        },
      ],
    },
    {
      passage: {
        id: 'read-b1-2',
        level: 'B1',
        title: 'Bicycle Cities: Rethinking Urban Transport',
        topic: 'Environment & Cities',
        wordCount: 220,
        passage: `As urban populations continue to expand, traffic congestion and air pollution have become pressing issues for municipal leaders worldwide. In response, several European metropolises, such as Copenhagen and Amsterdam, have invested heavily in dedicated cycling infrastructure, demonstrating that bicycles can serve as a primary mode of daily commuting.

Building safe cycling networks requires much more than simply painting white lines along the side of existing car lanes. True cycling infrastructure involves physically separated bike tracks, specialized traffic signals at intersections, and secure bike parking near major railway stations. When cycling feels safe and convenient, citizens of all ages—including school children and senior citizens—regularly choose two wheels over cars.

The benefits of this shift extend beyond cleaner air and reduced carbon emissions. Studies indicate that regular cycling significantly improves cardiovascular health, reduces stress levels, and lowers public healthcare expenditure. Moreover, businesses situated along pedestrian and bike-friendly boulevards often experience higher customer visits compared to stores along congested motor highways.`,
      },
      questions: [
        {
          id: 'read-b1-2-q1',
          prompt: 'What is the main topic of the passage?',
          options: [
            'How European cities design racing bicycles for sport.',
            'How dedicated bicycle infrastructure transforms urban commuting and health.',
            'Why car manufacturing is declining across Europe.',
            'The history of public railway systems in Amsterdam.',
          ],
          correctAnswer: 'How dedicated bicycle infrastructure transforms urban commuting and health.',
          explanation: 'The passage explores how investing in cycling networks solves urban problems and provides health and economic benefits.',
          tags: ['reading', 'main-idea', 'environment'],
          suggestedLessonId: 'travel',
        },
        {
          id: 'read-b1-2-q2',
          prompt: 'According to paragraph 2, what is necessary for true cycling infrastructure?',
          options: [
            'Simply painting white lines on regular car roads.',
            'Separated tracks, dedicated traffic signals, and secure parking.',
            'Banning cars from all streets throughout the entire city.',
            'Providing free bicycles to all university students.',
          ],
          correctAnswer: 'Separated tracks, dedicated traffic signals, and secure parking.',
          explanation: 'Paragraph 2 highlights physically separated bike tracks, specialized signals, and secure parking near stations.',
          tags: ['reading', 'detail', 'transport'],
          suggestedLessonId: 'city-life',
        },
        {
          id: 'read-b1-2-q3',
          prompt: 'What economic advantage for local businesses is mentioned in the final paragraph?',
          options: [
            'They receive direct government grants for buying bikes.',
            'They often see increased foot traffic and customer visits.',
            'They spend less money on electricity and lighting.',
            'They can deliver heavy goods faster without trucks.',
          ],
          correctAnswer: 'They often see increased foot traffic and customer visits.',
          explanation: 'The final sentence notes that businesses along bike-friendly boulevards often experience higher customer visits.',
          tags: ['reading', 'detail', 'business'],
          suggestedLessonId: 'career-workplace',
        },
      ],
    },
  ],
  B2: [
    {
      passage: {
        id: 'read-b2-1',
        level: 'B2',
        title: 'The Psychology of Decision Fatigue in the Digital Age',
        topic: 'Psychology & Productivity',
        wordCount: 295,
        passage: `Every day, an average adult makes thousands of decisions, ranging from trivial selections—such as deciding what outfit to wear or which podcast episode to stream—to high-stakes professional evaluations. Cognitive psychologists refer to the deteriorating quality of decisions made following a long session of decision-making as "decision fatigue." Unlike physical exhaustion, which manifests with muscular soreness and heavy limbs, mental depletion is subtle and frequently goes unnoticed by the individual experiencing it.

When cognitive reserves run low, the brain instinctively searches for mental shortcuts. These shortcuts usually manifest in one of two contrasting behavioral extremes: reckless impulsivity or chronic procrastination. In the former case, a fatigued individual might agree to an expensive impulse purchase without careful consideration. In the latter, they may simply postpone making any choice at all, effectively paralyzed by the prospect of analyzing alternatives.

The modern digital landscape dramatically intensifies this phenomenon. Smartphones subject users to a relentless deluge of notifications, algorithmically generated feeds, and micro-choices. Choosing between fifty different brands of shampoo on an e-commerce platform or endlessly scrolling through entertainment catalogs depletes our finite mental energy before we even confront meaningful life objectives.

To mitigate decision fatigue, behavioral scientists recommend establishing structured daily routines. High-performing individuals often streamline secondary choices—such as adhering to a uniform wardrobe or pre-planning weekly meals—thereby preserving their executive cognitive stamina for complex problem-solving and creative endeavors.`,
      },
      questions: [
        {
          id: 'read-b2-1-q1',
          prompt: 'What is the primary characteristic of "decision fatigue" described in paragraph 1?',
          options: [
            'Immediate muscle fatigue that prevents physical exercise.',
            'A noticeable headache caused by bright computer screens.',
            'The gradual decline in decision quality following prolonged choice-making.',
            'The permanent loss of memory in older adults.',
          ],
          correctAnswer: 'The gradual decline in decision quality following prolonged choice-making.',
          explanation: 'Paragraph 1 defines it as "the deteriorating quality of decisions made following a long session of decision-making".',
          tags: ['reading', 'main-idea', 'psychology'],
          suggestedLessonId: 'mind-learning',
        },
        {
          id: 'read-b2-1-q2',
          prompt: 'According to paragraph 2, how does a depleted brain typically react?',
          options: [
            'By adopting shortcuts that lead to either impulsive actions or avoidance.',
            'By systematically calculating mathematical probabilities for every choice.',
            'By seeking out harder and more complicated tasks to stay alert.',
            'By falling into deep sleep within several minutes.',
          ],
          correctAnswer: 'By adopting shortcuts that lead to either impulsive actions or avoidance.',
          explanation: 'The passage explains shortcuts manifest in two extremes: reckless impulsivity or chronic procrastination.',
          tags: ['reading', 'detail', 'behavior'],
          suggestedLessonId: 'mind-learning',
        },
        {
          id: 'read-b2-1-q3',
          prompt: 'Why does the author argue that smartphones worsen decision fatigue?',
          options: [
            'Because smartphones require frequent battery recharging.',
            'Because constant notifications and endless choices drain cognitive stamina.',
            'Because digital keyboards are difficult to type on accurately.',
            'Because online prices fluctuate too quickly for consumers to track.',
          ],
          correctAnswer: 'Because constant notifications and endless choices drain cognitive stamina.',
          explanation: 'Paragraph 3 describes smartphones subjecting users to a relentless deluge of micro-choices and notifications that deplete mental energy.',
          tags: ['reading', 'inference', 'technology'],
          suggestedLessonId: 'technology',
        },
        {
          id: 'read-b2-1-q4',
          prompt: 'What practical strategy does the passage suggest to combat this issue?',
          options: [
            'Avoiding all decision-making after 12:00 PM every day.',
            'Routinizing minor decisions to preserve mental stamina for important matters.',
            'Switching to paper documents exclusively in professional workplaces.',
            'Purchasing items only during weekend sales promotions.',
          ],
          correctAnswer: 'Routinizing minor decisions to preserve mental stamina for important matters.',
          explanation: 'Paragraph 4 recommends structured routines and streamlining secondary choices to conserve executive cognitive stamina.',
          tags: ['reading', 'purpose', 'productivity'],
          suggestedLessonId: 'career-workplace',
        },
      ],
    },
    {
      passage: {
        id: 'read-b2-2',
        level: 'B2',
        title: 'The Resilience of Traditional Paper Books',
        topic: 'Media & Culture',
        wordCount: 285,
        passage: `When commercial e-readers and tablet computers first flooded consumer markets in the late 2000s, industry analysts confidently predicted the imminent demise of printed books. Physical volumes were characterized as cumbersome, resource-heavy relics destined to be eclipsed by lightweight digital devices capable of housing thousands of electronic titles in a slim pocket-sized chassis.

However, subsequent sales statistics have revealed a remarkably resilient counter-narrative. Printed book sales have not only stabilized but have steadily expanded in multiple major markets, particularly within fiction, young adult literature, and art publications. Meanwhile, e-book sales have plateaued, capturing a steady but limited market share rather than completely monopolizing the publishing ecosystem.

Researchers investigating this phenomenon highlight the tactile and spatial dimensions of physical reading. Readers frequently report deeper narrative immersion and superior information retention when engaging with printed ink on textured paper. Unlike digital screens, physical pages offer visual landmarks and spatial anchors—such as the tangible thickness of pages read versus those remaining—which facilitate cognitive mapping of intricate arguments and storylines.

Additionally, "screen fatigue" has driven consumers to view physical books as mindful sanctuaries from the omnipresent glare of work monitors and smartphones. Holding a physical volume represents an intentional disconnection from notification banners and digital distractions, providing a sensory reading experience that digital pixels cannot replicate.`,
      },
      questions: [
        {
          id: 'read-b2-2-q1',
          prompt: 'What did market analysts initially predict regarding physical books in the late 2000s?',
          options: [
            'They would become collector items with soaring prices.',
            'They would soon disappear, completely replaced by electronic readers.',
            'They would merge with audio recording technology.',
            'They would remain dominant exclusively in academic science libraries.',
          ],
          correctAnswer: 'They would soon disappear, completely replaced by electronic readers.',
          explanation: 'Paragraph 1 notes analysts predicted the "imminent demise of printed books", viewing them as relics to be eclipsed by digital devices.',
          tags: ['reading', 'detail', 'history'],
          suggestedLessonId: 'media-journalism',
        },
        {
          id: 'read-b2-2-q2',
          prompt: 'What do researchers credit for the superior comprehension often associated with print reading?',
          options: [
            'The lower cost of printed paperbacks compared to digital files.',
            'Tactile feedback and spatial landmarks that assist cognitive mapping.',
            'The requirement to sit in well-lit study rooms while reading.',
            'The larger font size typically used in antique book editions.',
          ],
          correctAnswer: 'Tactile feedback and spatial landmarks that assist cognitive mapping.',
          explanation: 'Paragraph 3 discusses how physical pages provide tactile dimensions, visual landmarks, and spatial anchors that facilitate cognitive mapping.',
          tags: ['reading', 'detail', 'psychology'],
          suggestedLessonId: 'mind-learning',
        },
        {
          id: 'read-b2-2-q3',
          prompt: 'The word "plateaued" in paragraph 2 most closely means:',
          options: [
            'Decreased to zero suddenly.',
            'Fluctuated uncontrollably from month to month.',
            'Reached a steady, stable level without further steep growth.',
            'Tripled in market capitalization.',
          ],
          correctAnswer: 'Reached a steady, stable level without further steep growth.',
          explanation: '"Plateaued" means flattening out at a stable level after initial growth.',
          tags: ['reading', 'vocabulary-in-context'],
          suggestedLessonId: 'academic-research',
        },
        {
          id: 'read-b2-2-q4',
          prompt: 'According to the final paragraph, why do many modern readers view physical books as "sanctuaries"?',
          options: [
            'They offer an escape from digital screens and endless notifications.',
            'They can be stored in historic church libraries.',
            'They are immune to physical water damage.',
            'They allow readers to multitask while listening to podcasts.',
          ],
          correctAnswer: 'They offer an escape from digital screens and endless notifications.',
          explanation: 'The final paragraph mentions readers view books as mindful sanctuaries to disconnect from screen fatigue and digital notifications.',
          tags: ['reading', 'inference', 'culture'],
          suggestedLessonId: 'lifestyle-wellbeing',
        },
      ],
    },
  ],
  C1: [
    {
      passage: {
        id: 'read-c1-1',
        level: 'C1',
        title: 'The Algorithmic Commons and the Commodification of Attention',
        topic: 'Media Theory & Technology',
        wordCount: 380,
        passage: `In contemporary digital discourse, public squares have been largely supplanted by proprietary platforms governed by proprietary optimization algorithms. While early cyber-optimists envisioned the internet as a frictionless egalitarian commons fostering deliberative democracy, the prevailing architecture of social media is fundamentally organized around an extractive economic imperative: the monetization of human attention.

To maximize advertising revenue, recommendation engines are engineered to prioritize algorithmic engagement metrics over informational veracity or nuanced discourse. Extensive empirical studies indicate that provocative, emotionally charged content—particularly outrage and tribal antagonism—circulates with vastly superior velocity compared to dispassionate analytical commentary. Consequently, algorithmic curation inadvertently polarizes civic discourse, eroding social trust and entrenching cognitive silos.

This dynamic cannot be adequately addressed merely through appeals to individual media literacy. While cultivating critical discernment remains valuable, framing systemic information disorder as a failure of personal willpower ignores the immense asymmetry between an isolated user and hyper-optimized behavioral engineering systems designed by world-class data scientists. When interfaces deploy variable reward schedules reminiscent of gambling mechanics, resistance requires relentless cognitive expenditure.

Proposals for structural remediation increasingly emphasize algorithmic transparency and the decoupling of platform revenue from hyper-targeted surveillance metrics. Legal scholars advocate for establishing fiduciary duties for platform architects, obligating them to prioritize public welfare and informational integrity over metric maximization. Until regulatory frameworks align corporate incentives with societal flourishing, the digital commons will remain hostage to the perverse imperatives of the attention economy.`,
      },
      questions: [
        {
          id: 'read-c1-1-q1',
          prompt: 'What central contrast does the author establish in the opening paragraph?',
          options: [
            'Between print journalism and broadcast television.',
            'Between early democratic internet ideals and today’s extractive commercial reality.',
            'Between European data regulations and American market deregulation.',
            'Between hardware processing capabilities and network bandwidth limitations.',
          ],
          correctAnswer: 'Between early democratic internet ideals and today’s extractive commercial reality.',
          explanation: 'Paragraph 1 contrasts the early vision of an egalitarian commons with modern proprietary platforms maximizing attention monetization.',
          tags: ['reading', 'main-idea', 'media-theory'],
          suggestedLessonId: 'media-journalism',
        },
        {
          id: 'read-c1-1-q2',
          prompt: 'Why, according to paragraph 2, does emotionally polarizing content spread more rapidly?',
          options: [
            'Because government agencies mandate the promotion of sensational news.',
            'Because recommendation algorithms optimize for engagement, favoring outrage over nuanced analysis.',
            'Because readers lack the technological equipment to view scientific publications.',
            'Because factual reporting is prohibitively expensive to index on search engines.',
          ],
          correctAnswer: 'Because recommendation algorithms optimize for engagement, favoring outrage over nuanced analysis.',
          explanation: 'Paragraph 2 explains engines prioritize engagement metrics, and outrage circulates with far superior velocity.',
          tags: ['reading', 'inference', 'technology'],
          suggestedLessonId: 'politics-society',
        },
        {
          id: 'read-c1-1-q3',
          prompt: 'Why does the author consider "individual media literacy" insufficient on its own (paragraph 3)?',
          options: [
            'Because educational institutions refuse to teach digital skills.',
            'Because individual willpower cannot match sophisticated, asymmetric behavioral engineering.',
            'Because users are inherently incapable of recognizing misinformation.',
            'Because internet access is too intermittent for systematic study.',
          ],
          correctAnswer: 'Because individual willpower cannot match sophisticated, asymmetric behavioral engineering.',
          explanation: 'Paragraph 3 notes the immense asymmetry between an isolated user and hyper-optimized behavioral systems designed by behavioral scientists.',
          tags: ['reading', 'argument', 'critical-thinking'],
          suggestedLessonId: 'academic-research',
        },
        {
          id: 'read-c1-1-q4',
          prompt: 'What does the author suggest as a meaningful solution in the final paragraph?',
          options: [
            'A total international ban on all algorithmic computer programming.',
            'Establishing structural legal duties and decoupling business models from engagement metrics.',
            'Leaving market forces entirely unregulated to encourage organic innovation.',
            'Requiring individuals to pay subscription fees for every website visited.',
          ],
          correctAnswer: 'Establishing structural legal duties and decoupling business models from engagement metrics.',
          explanation: 'The final paragraph advocates for fiduciary duties, transparency, and aligning corporate incentives with societal flourishing.',
          tags: ['reading', 'purpose', 'policy'],
          suggestedLessonId: 'law-justice',
        },
      ],
    },
  ],
  C2: [
    {
      passage: {
        id: 'read-c2-1',
        level: 'C2',
        title: 'Historiography, Epistemic Humility, and the Illusion of Historical Inevitability',
        topic: 'Philosophy of History & Epistemology',
        wordCount: 420,
        passage: `A pervasive vulnerability in retrospective historical analysis is the teleological fallacy: the tacit assumption that prevailing socio-political paradigms were the inevitable culmination of preceding historical currents. When historians examine past upheavals—whether the collapse of imperial dynastic orders or the rapid diffusion of transformative industrial technologies—hindsight bias routinely casts contingent occurrences as predetermined outcomes, thereby obscuring the profound indeterminacy experienced by historical contemporaries.

This deterministic distortion stems from an inherent cognitive desire for coherent narrative structure. The human intellect instinctively recoils from chaotic serendipity, gravitating instead toward neat causal chains that retroactively endow historical trajectories with structural necessity. In doing so, historical discourse frequently marginalizes counterfactual possibilities—the fragile inflection points where minute contingencies, idiosyncrasies of leadership, or volatile climatic anomalies could have easily propelled civilization along radically disparate pathways.

To counter such epistemic hubris, contemporary historiographical scholarship increasingly champions "epistemic humility." This methodological paradigm demands that scholars reconstruct the past not from the vantage point of triumphant outcomes, but through the granular, uncertain horizon of the actors themselves. By rigorously interrogating archival fragments, provisional memoranda, and private correspondence, the historian excavates the acute ambivalence, discarded alternatives, and profound foreboding that characterized decisive turning points.

Far from succumbing to paralyzing historical relativism, acknowledging radical contingency enriches our comprehension of agency and institutional fragility. Recognizing that modern societal architectures were neither preordained nor guaranteed serves as a potent antidote to complacency. It reminds contemporary policymakers and citizens alike that present equilibria are inherently provisional, perpetually susceptible to unforeseen perturbations, and continually reliant on intentional civic stewardship.`,
      },
      questions: [
        {
          id: 'read-c2-1-q1',
          prompt: 'What is the "teleological fallacy" in historical analysis as delineated in paragraph 1?',
          options: [
            'The belief that historical archives are fundamentally fraudulent and untrustworthy.',
            'The retrospective assumption that historical developments were preordained and inevitable.',
            'The methodological reliance on archaeological artifacts over written documents.',
            'The refusal to acknowledge economic factors when analyzing geopolitical conflict.',
          ],
          correctAnswer: 'The retrospective assumption that historical developments were preordained and inevitable.',
          explanation: 'Paragraph 1 defines it as the tacit assumption that socio-political paradigms were the inevitable culmination of preceding currents, obscuring contingency.',
          tags: ['reading', 'precision', 'philosophy'],
          suggestedLessonId: 'academic-research',
        },
        {
          id: 'read-c2-1-q2',
          prompt: 'According to paragraph 2, what psychological tendency fosters deterministic historical narratives?',
          options: [
            'A craving for coherent causal narratives that dispel uncomfortable randomness.',
            'An aversion to reading lengthy historical manuscripts.',
            'A preference for fictional literature over biographical accounts.',
            'The intentional manipulation of historical archives by political regimes.',
          ],
          correctAnswer: 'A craving for coherent causal narratives that dispel uncomfortable randomness.',
          explanation: 'Paragraph 2 explains the intellect recoils from chaotic serendipity and gravitates toward neat causal chains that endow trajectories with necessity.',
          tags: ['reading', 'detail', 'epistemology'],
          suggestedLessonId: 'mind-learning',
        },
        {
          id: 'read-c2-1-q3',
          prompt: 'How does the methodology of "epistemic humility" (paragraph 3) propose to analyze historical events?',
          options: [
            'By evaluating actors strictly by modern moral standards.',
            'By reconstructing situations from the uncertain, prospective vantage point of the historical actors.',
            'By discarding all written documents in favor of speculative fiction.',
            'By asserting that historical truths are entirely unattainable and irrelevant.',
          ],
          correctAnswer: 'By reconstructing situations from the uncertain, prospective vantage point of the historical actors.',
          explanation: 'Paragraph 3 states it demands reconstructing the past through the granular, uncertain horizon of the actors themselves.',
          tags: ['reading', 'methodology', 'critical-thinking'],
          suggestedLessonId: 'academic-research',
        },
        {
          id: 'read-c2-1-q4',
          prompt: 'What civic implication does the author deduce from historical contingency in the final paragraph?',
          options: [
            'That modern societies are invulnerable to future crises.',
            'That present socio-political structures are provisional and necessitate ongoing deliberate stewardship.',
            'That democratic governance is biologically destined to collapse within centuries.',
            'That historical scholarship should be defunded in favor of predictive computation.',
          ],
          correctAnswer: 'That present socio-political structures are provisional and necessitate ongoing deliberate stewardship.',
          explanation: 'The conclusion emphasizes that present equilibria are provisional, susceptible to perturbations, and reliant on intentional civic stewardship.',
          tags: ['reading', 'inference', 'synthesis'],
          suggestedLessonId: 'politics-society',
        },
      ],
    },
  ],
};
