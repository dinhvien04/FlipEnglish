import { CEFRLevel, ReadingPassage } from '../../types/exam';

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
  A1: [
    {
      passage: {
        id: 'read-a1-1',
        level: 'A1',
        title: "Elena's Morning Routine",
        topic: 'Daily Life',
        wordCount: 110,
        passage: `Elena is a university student in Madrid. She wakes up at seven o'clock every morning. First, she washes her face and prepares a simple breakfast of toast, eggs, and hot green tea. 

At eight o'clock, she walks to the bus station near her apartment. The bus ride to university takes twenty minutes. In the morning, Elena has two English classes. She loves learning new vocabulary and speaking with her classmates. At lunchtime, she eats a fresh salad in the campus park with her friend Sarah.`,
      },
      questions: [
        {
          id: 'read-a1-1-q1',
          prompt: 'What time does Elena wake up every morning?',
          options: [
            "At six o'clock.",
            "At seven o'clock.",
            "At eight o'clock.",
            "At nine o'clock.",
          ],
          correctAnswer: "At seven o'clock.",
          explanation: "The passage states: 'She wakes up at seven o'clock every morning.'",
          tags: ['reading', 'detail', 'daily-routine'],
          suggestedLessonId: 'daily-routine',
        },
        {
          id: 'read-a1-1-q2',
          prompt: 'How does Elena travel to her university?',
          options: [
            'She rides her bicycle.',
            'She takes the bus.',
            'She drives a car.',
            'She walks the whole way.',
          ],
          correctAnswer: 'She takes the bus.',
          explanation: 'The passage explains she walks to the bus station and takes a 20-minute bus ride to university.',
          tags: ['reading', 'detail', 'transport'],
          suggestedLessonId: 'travel',
        },
        {
          id: 'read-a1-1-q3',
          prompt: 'Where does Elena eat lunch?',
          options: [
            'In a restaurant downtown.',
            'At home in her apartment.',
            'In the campus park.',
            'In the university library.',
          ],
          correctAnswer: 'In the campus park.',
          explanation: 'The text notes: "At lunchtime, she eats a fresh salad in the campus park with her friend Sarah."',
          tags: ['reading', 'detail', 'food'],
          suggestedLessonId: 'food',
        },
      ],
    },
    {
      passage: {
        id: 'read-a1-2',
        level: 'A1',
        title: 'A Visit to the City Library',
        topic: 'Places & Hobbies',
        wordCount: 115,
        passage: `The central library in our town is a very quiet and comfortable building. It is open from Monday to Saturday, from nine in the morning until six in the evening. 

There are thousands of books, magazines, and newspapers for children and adults. Visitors can sit on soft armchairs near the big windows. Many students bring their laptops to do homework because the internet connection is fast and free. You can borrow up to four books for two weeks with a library card.`,
      },
      questions: [
        {
          id: 'read-a1-2-q1',
          prompt: 'When is the town library open?',
          options: [
            'Every day of the week including Sunday.',
            'Monday to Saturday from 9:00 AM to 6:00 PM.',
            'Only on weekend mornings.',
            'Tuesday to Friday in the afternoon only.',
          ],
          correctAnswer: 'Monday to Saturday from 9:00 AM to 6:00 PM.',
          explanation: 'The passage explicitly says: "It is open from Monday to Saturday, from nine in the morning until six in the evening."',
          tags: ['reading', 'detail', 'time'],
          suggestedLessonId: 'places',
        },
        {
          id: 'read-a1-2-q2',
          prompt: 'Why do students like to do homework at the library?',
          options: [
            'Because food and drinks are free for everyone.',
            'Because the internet connection is fast and free.',
            'Because all classes are held inside the library.',
            'Because there are no chairs in the building.',
          ],
          correctAnswer: 'Because the internet connection is fast and free.',
          explanation: 'The text states: "Many students bring their laptops to do homework because the internet connection is fast and free."',
          tags: ['reading', 'reason', 'study'],
          suggestedLessonId: 'school',
        },
        {
          id: 'read-a1-2-q3',
          prompt: 'How many books can a visitor borrow at one time?',
          options: [
            'Only one book for one week.',
            'Up to four books for two weeks.',
            'Up to ten books for one month.',
            'Unlimited books with no return date.',
          ],
          correctAnswer: 'Up to four books for two weeks.',
          explanation: 'The text states: "You can borrow up to four books for two weeks with a library card."',
          tags: ['reading', 'detail', 'numbers'],
          suggestedLessonId: 'places',
        },
      ],
    },
  ],
  A2: [
    {
      passage: {
        id: 'read-a2-1',
        level: 'A2',
        title: 'Planning a Weekend Hiking Trip',
        topic: 'Travel & Nature',
        wordCount: 165,
        passage: `Last weekend, Marcus and his brother Daniel decided to go hiking in the Green Valley National Park. Before leaving home on Saturday morning, they carefully packed their backpacks with water bottles, energy bars, a small first-aid kit, and a paper map of the mountain trails.

The weather forecast predicted clear blue skies in the morning but possible rain showers in the late afternoon. Because of this, both hikers packed lightweight waterproof jackets. 

They started hiking along the Pine Trail at eight-thirty. The trail was steep, but the view of the lake from the summit was amazing. They stopped at a wooden picnic table at noon to eat lunch and take photographs. By three o'clock, dark clouds appeared, so they followed the path back down and reached their car safely before the rain began.`,
      },
      questions: [
        {
          id: 'read-a2-1-q1',
          prompt: 'What did Marcus and Daniel do before leaving home?',
          options: [
            'They bought new hiking boots at a shopping center.',
            'They packed essential items and a trail map in their backpacks.',
            'They called a taxi to drive them to the mountain top.',
            'They rented a cabin inside the national park.',
          ],
          correctAnswer: 'They packed essential items and a trail map in their backpacks.',
          explanation: 'Paragraph 1 notes they carefully packed water bottles, energy bars, a first-aid kit, and a paper map.',
          tags: ['reading', 'detail', 'travel'],
          suggestedLessonId: 'travel',
        },
        {
          id: 'read-a2-1-q2',
          prompt: 'Why did the hikers pack waterproof jackets?',
          options: [
            'Because it was snowing heavily on the summit.',
            'Because the forecast predicted possible rain in the late afternoon.',
            'Because jackets were required by the park rangers.',
            'Because they planned to swim in the mountain lake.',
          ],
          correctAnswer: 'Because the forecast predicted possible rain in the late afternoon.',
          explanation: 'Paragraph 2 explains the forecast warned of possible afternoon showers, prompting them to pack rain jackets.',
          tags: ['reading', 'reason', 'weather'],
          suggestedLessonId: 'weather',
        },
        {
          id: 'read-a2-1-q3',
          prompt: 'Why did Marcus and Daniel head back to their car at three o\'clock?',
          options: [
            'They lost their map on the trail.',
            'Dark clouds appeared, suggesting approaching rain.',
            'Daniel injured his foot on a rock.',
            'The park gates were closing early.',
          ],
          correctAnswer: 'Dark clouds appeared, suggesting approaching rain.',
          explanation: 'The text says: "By three o\'clock, dark clouds appeared, so they followed the path back down and reached their car safely before the rain began."',
          tags: ['reading', 'inference', 'nature'],
          suggestedLessonId: 'outdoor-activities',
        },
      ],
    },
    {
      passage: {
        id: 'read-a2-2',
        level: 'A2',
        title: 'Working at the Corner Cafe',
        topic: 'Work & Daily Life',
        wordCount: 170,
        passage: `Sophia started working part-time as a barista at the Corner Cafe two months ago. She works three shifts a week while attending college classes in the mornings. 

Her main responsibilities include taking customer orders at the register, preparing hot drinks like cappuccinos and lattes, and keeping the seating tables clean and tidy. In the beginning, Sophia was nervous about memorizing all the coffee recipes and operating the large espresso machine. However, her manager gave her practical training during her first week.

Now, Sophia feels confident and enjoys chatting with regular neighborhood customers who visit every morning. She says the best part of her job is learning good communication skills and working in a friendly team. In the future, she hopes to open her own bakery and coffee shop.`,
      },
      questions: [
        {
          id: 'read-a2-2-q1',
          prompt: 'How often does Sophia work at the cafe?',
          options: [
            'Full-time every weekday from morning to night.',
            'Three shifts per week alongside her college classes.',
            'Only on Sunday afternoons.',
            'Every weekend for twelve hours a day.',
          ],
          correctAnswer: 'Three shifts per week alongside her college classes.',
          explanation: 'Paragraph 1 mentions she works part-time three shifts a week while taking morning college classes.',
          tags: ['reading', 'detail', 'work'],
          suggestedLessonId: 'jobs',
        },
        {
          id: 'read-a2-2-q2',
          prompt: 'What was difficult for Sophia when she first started the job?',
          options: [
            'Arriving on time for morning shifts.',
            'Memorizing recipes and using the espresso machine.',
            'Walking to the cafe from her apartment.',
            'Finding clean clothes for work.',
          ],
          correctAnswer: 'Memorizing recipes and using the espresso machine.',
          explanation: 'Paragraph 2 notes she was nervous about memorizing all coffee recipes and operating the large espresso machine.',
          tags: ['reading', 'detail', 'career'],
          suggestedLessonId: 'career',
        },
        {
          id: 'read-a2-2-q3',
          prompt: 'What is Sophia\'s long-term dream mentioned in the passage?',
          options: [
            'To become a full-time university professor.',
            'To open her own bakery and coffee shop one day.',
            'To move to another country immediately.',
            'To stop working and travel forever.',
          ],
          correctAnswer: 'To open her own bakery and coffee shop one day.',
          explanation: 'The final sentence states: "In the future, she hopes to open her own bakery and coffee shop."',
          tags: ['reading', 'inference', 'goals'],
          suggestedLessonId: 'future-plans',
        },
      ],
    },
  ],
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
    {
      passage: {
        id: 'read-c1-2',
        level: 'C1',
        title: 'Microclimates, Urban Heat Islands, and Biophilic Architecture',
        topic: 'Architecture & Environmental Science',
        wordCount: 310,
        passage: `The intensification of the urban heat island (UHI) effect represents one of the most critical structural challenges confronting 21st-century civil engineering. Densely built urban cores, characterized by extensive impermeable surfaces, dark asphalt pavements, and high thermal mass concrete, absorb and re-radiate solar irradiance at rates vastly exceeding surrounding rural landscapes. Anthropogenic heat emissions from vehicular combustion and building HVAC systems further compound thermal distress during nocturnal cooling periods.

To counteract this escalating microclimatic degradation, contemporary architects are transcending conventional greenwashing by integrating biophilic design principles into core structural envelopes. Rather than merely applying superficial ornamental greenery, progressive civic frameworks incorporate living wall bio-filters, high-albedo reflective coatings, and passive evaporative wind corridors engineered to channel ambient prevailing breezes through high-density residential blocks.

Empirical studies indicate that strategically deployed urban forestry and vegetative canopies can reduce localized surface temperatures by up to 8 degrees Celsius while simultaneously sequestering particulate pollutants. However, successful scaling demands comprehensive municipal policy reforms, including statutory biodiversity mandates and subsidized retrofit incentives for commercial real estate developers. Without concerted cross-sectoral interventions, the confluence of climate disruption and urban densification will exacerbate public health inequities in vulnerable metropolitan communities.`,
      },
      questions: [
        {
          id: 'read-c1-2-q1',
          prompt: 'What primary physical factors drive the urban heat island effect according to paragraph 1?',
          options: [
            'Excessive cloud cover and subterranean geothermal activity.',
            'Impermeable surfaces, high thermal mass materials, and anthropogenic heat emissions.',
            'The complete lack of underground public transportation systems.',
            'High wind velocities that trap cool air in high-altitude zones.',
          ],
          correctAnswer: 'Impermeable surfaces, high thermal mass materials, and anthropogenic heat emissions.',
          explanation: 'Paragraph 1 identifies impermeable surfaces, dark asphalt, high thermal mass concrete, and HVAC/vehicular emissions as the core drivers.',
          tags: ['reading', 'detail', 'science'],
          suggestedLessonId: 'environment-climate',
        },
        {
          id: 'read-c1-2-q2',
          prompt: 'How does the author characterize "biophilic design" in progressive architectural frameworks (paragraph 2)?',
          options: [
            'As an expensive luxury reserved exclusively for suburban homes.',
            'As an engineered structural integration of bio-filters and passive wind corridors rather than superficial ornament.',
            'As a temporary trend that increases building maintenance costs.',
            'As a replacement for standard fire safety regulations.',
          ],
          correctAnswer: 'As an engineered structural integration of bio-filters and passive wind corridors rather than superficial ornament.',
          explanation: 'Paragraph 2 contrasts superficial greenery with integrated living wall bio-filters, reflective coatings, and engineered wind corridors.',
          tags: ['reading', 'inference', 'architecture'],
          suggestedLessonId: 'architecture-design',
        },
        {
          id: 'read-c1-2-q3',
          prompt: 'What quantitative impact of urban forestry is cited in paragraph 3?',
          options: [
            'A 50% decrease in municipal water consumption.',
            'A reduction of localized surface temperatures by up to 8 degrees Celsius.',
            'An immediate doubling of commercial real estate values.',
            'A complete elimination of all airborne particulate matter.',
          ],
          correctAnswer: 'A reduction of localized surface temperatures by up to 8 degrees Celsius.',
          explanation: 'The text notes studies show urban forestry can reduce localized surface temperatures by up to 8 degrees Celsius.',
          tags: ['reading', 'detail', 'data'],
          suggestedLessonId: 'science-nature',
        },
        {
          id: 'read-c1-2-q4',
          prompt: 'What is the author\'s main conclusion in the final paragraph?',
          options: [
            'Individual homeowners alone can solve metropolitan warming without government support.',
            'Cross-sectoral interventions and municipal policy reforms are indispensable to prevent worsening public health inequities.',
            'Urban living should be abandoned in favor of rural resettlement.',
            'Commercial real estate development should be outlawed entirely.',
          ],
          correctAnswer: 'Cross-sectoral interventions and municipal policy reforms are indispensable to prevent worsening public health inequities.',
          explanation: 'The conclusion emphasizes that comprehensive policy reforms, biodiversity mandates, and cross-sectoral interventions are essential.',
          tags: ['reading', 'purpose', 'synthesis'],
          suggestedLessonId: 'society-politics',
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
    {
      passage: {
        id: 'read-c2-2',
        level: 'C2',
        title: 'Cognitive Cartography, Linguistic Relativity, and Epistemic Diversity',
        topic: 'Linguistics & Cognitive Philosophy',
        wordCount: 410,
        passage: `The Sapir-Whorf hypothesis, or linguistic relativity, has experienced a profound renaissance in contemporary cognitive neuroscience. While early twentieth-century formulations were frequently caricatured as rigid linguistic determinism—the dubious assertion that language circumscribes the absolute boundaries of thought—nuanced empirical investigations now demonstrate that lexical structures and morphosyntactic categories modulate perceptual salience, attentional allocation, and mnemonic encoding.

Consider cross-linguistic variations in spatial orientation systems. Whereas languages utilizing egocentric coordinates (e.g., relative left/right distinctions) tether spatial memory to the observer's momentary somatic orientation, languages reliant on absolute geocentric coordinates (e.g., cardinal directions) require speakers to maintain a subconscious, perpetual dead-reckoning awareness of ambient compass bearings. Cognitive experiments reveal that speakers of geocentric systems demonstrate extraordinary spatial orientation fidelity even in unfamiliar, subterranean environments, reflecting a cognitive habitus deeply scaffolded by linguistic idiom.

Similarly, grammatical aspect and lexical aspectual framing shape how events are parsed and retrospectively reconstructed. Languages that consistently mandate grammatical marking of endpoint completion prime speakers to prioritize teleological agentive intentions over ambient circumstantial background. These perceptual divergences are not immutable cognitive prisons, but rather habitual cognitive grooves—probabilistic biases that channel mental computation along paths of least semantic resistance.

The implications of these findings transcend academic linguistics, bearing directly on epistemic diversity and global knowledge preservation. The accelerating extinction of indigenous language families entails not merely the vanishing of phonetic inventories or folklore, but the irreversible erasure of unique epistemological architectures. Each idiosyncratic language embodies an irreplaceable cognitive taxonomy—a centuries-old intellectual cartography for conceptualizing ecological dynamics, temporal progression, and human relationality.`,
      },
      questions: [
        {
          id: 'read-c2-2-q1',
          prompt: 'How does contemporary cognitive neuroscience differentiate modern linguistic relativity from early formulations (paragraph 1)?',
          options: [
            'By proving language completely dictates genetic brain structures.',
            'By moving away from rigid determinism toward subtle modulation of attention, perception, and memory.',
            'By dismissing all cross-linguistic differences as superficial translation artifacts.',
            'By asserting that all human languages share identical grammatical categories.',
          ],
          correctAnswer: 'By moving away from rigid determinism toward subtle modulation of attention, perception, and memory.',
          explanation: 'Paragraph 1 contrasts rigid determinism with nuanced evidence that linguistic structures modulate perceptual salience, attention, and memory encoding.',
          tags: ['reading', 'contrast', 'linguistics'],
          suggestedLessonId: 'mind-learning',
        },
        {
          id: 'read-c2-2-q2',
          prompt: 'What does the comparison between egocentric and geocentric spatial languages demonstrate in paragraph 2?',
          options: [
            'That speakers of relative systems have superior navigational equipment.',
            'That linguistic orientation conventions cultivate subconscious, enduring perceptual habits and competencies.',
            'That subterranean environments permanently disable human memory.',
            'That cardinal directions cannot be translated across different language families.',
          ],
          correctAnswer: 'That linguistic orientation conventions cultivate subconscious, enduring perceptual habits and competencies.',
          explanation: 'Paragraph 2 demonstrates geocentric language speakers maintain constant spatial awareness as a cognitive habitus scaffolded by linguistic idiom.',
          tags: ['reading', 'argument', 'cognitive-science'],
          suggestedLessonId: 'academic-research',
        },
        {
          id: 'read-c2-2-q3',
          prompt: 'How does the author describe the influence of linguistic structures on thought in paragraph 3?',
          options: [
            'As impenetrable cognitive barriers that forbid alternative conceptualizations.',
            'As habitual pathways that channel mental processing along probabilistic trajectories.',
            'As biological defects that inhibit mathematical reasoning.',
            'As arbitrary stylistic choices with zero cognitive ramifications.',
          ],
          correctAnswer: 'As habitual pathways that channel mental processing along probabilistic trajectories.',
          explanation: 'Paragraph 3 defines them as "habitual cognitive grooves—probabilistic biases that channel mental computation along paths of least semantic resistance."',
          tags: ['reading', 'nuance', 'metaphor'],
          suggestedLessonId: 'mind-learning',
        },
        {
          id: 'read-c2-2-q4',
          prompt: 'What broader cultural and epistemological crisis does the final paragraph articulate?',
          options: [
            'The excessive proliferation of regional dialects in major cities.',
            'The loss of unique cognitive taxonomies and intellectual cartographies through language extinction.',
            'The economic burden of funding global translation software.',
            'The declining interest in studying foreign languages in modern universities.',
          ],
          correctAnswer: 'The loss of unique cognitive taxonomies and intellectual cartographies through language extinction.',
          explanation: 'The conclusion argues language extinction erases unique epistemological architectures and intellectual cartographies for understanding the world.',
          tags: ['reading', 'inference', 'epistemology'],
          suggestedLessonId: 'culture-society',
        },
      ],
    },
  ],
};
