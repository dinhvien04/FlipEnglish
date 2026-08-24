import { ConversationScenario } from '../../types/conversation';

export const CONVERSATION_SCENARIOS: ConversationScenario[] = [
  // ==========================================
  // 1. EVERYDAY (5 scenarios)
  // ==========================================
  {
    id: 'coffee-shop',
    title: 'Coffee Shop',
    category: 'Everyday',
    supportedLevels: ['A1', 'A2'],
    description: 'Order drinks and snacks at a local cafe and answer simple follow-up questions from the barista.',
    learnerGoal: 'Order a beverage, specify preferences (size, milk, takeaway), and ask for the total price.',
    aiRole: 'A friendly and helpful barista at a busy city cafe.',
    openingContext: 'The learner walks up to the cafe counter to place an order.',
    usefulExpressions: [
      { expression: "I'd like a medium latte, please.", meaning: 'Tôi muốn một ly latte cỡ vừa, làm ơn.', level: 'A1' },
      { expression: 'Can I have that to go?', meaning: 'Tôi có thể mang đi được không?', level: 'A1' },
      { expression: 'How much is that?', meaning: 'Cái này giá bao nhiêu?', level: 'A1' },
      { expression: 'With oat milk, please.', meaning: 'Với sữa yến mạch, làm ơn.', level: 'A2' },
      { expression: 'That will be all, thank you.', meaning: 'Thế là đủ rồi, cảm ơn bạn.', level: 'A2' },
    ],
    tags: ['ordering', 'food', 'cafe', 'polite-requests'],
    maxTurns: 8,
  },
  {
    id: 'restaurant',
    title: 'Restaurant Dinner',
    category: 'Everyday',
    supportedLevels: ['A1', 'A2', 'B1'],
    description: 'Request a table, order food from a menu, ask for recommendations, and ask for the bill.',
    learnerGoal: 'Ask for a table, order a main dish and a drink, ask about ingredients, and request the check politely.',
    aiRole: 'An attentive and courteous server at a modern casual restaurant.',
    openingContext: 'The learner enters a restaurant for lunch or dinner.',
    usefulExpressions: [
      { expression: 'A table for two, please.', meaning: 'Một bàn cho hai người, làm ơn.', level: 'A1' },
      { expression: 'What do you recommend?', meaning: 'Bạn gợi ý món nào?', level: 'A2' },
      { expression: 'Could we have the bill, please?', meaning: 'Làm ơn cho chúng tôi xin hóa đơn?', level: 'A2' },
      { expression: 'Does this dish contain nuts?', meaning: 'Món này có chứa đậu phộng/hạt không?', level: 'B1' },
      { expression: 'Could we get the dressing on the side?', meaning: 'Cho nước sốt để riêng được không?', level: 'B1' },
    ],
    tags: ['restaurant', 'dining', 'ordering', 'food'],
    maxTurns: 8,
  },
  {
    id: 'shopping',
    title: 'Clothing Store Shopping',
    category: 'Everyday',
    supportedLevels: ['A1', 'A2'],
    description: 'Ask for specific sizes, colors, fitting rooms, and prices while shopping for clothes.',
    learnerGoal: 'Find a specific clothing item, ask to try it on in your size, and decide whether to purchase it.',
    aiRole: 'A helpful shop assistant at a popular fashion retail store.',
    openingContext: 'The learner is browsing clothes in a retail store.',
    usefulExpressions: [
      { expression: 'Do you have this in medium?', meaning: 'Bạn có cái này size M không?', level: 'A1' },
      { expression: 'Where is the fitting room?', meaning: 'Phòng thử đồ ở đâu vậy?', level: 'A1' },
      { expression: 'It fits me very well.', meaning: 'Nó rất vừa vặn với tôi.', level: 'A2' },
      { expression: 'Do you have this in a different color?', meaning: 'Bạn có cái này màu khác không?', level: 'A2' },
      { expression: 'I will take this one.', meaning: 'Tôi sẽ lấy chiếc này.', level: 'A2' },
    ],
    tags: ['shopping', 'clothes', 'sizes', 'retail'],
    maxTurns: 8,
  },
  {
    id: 'meeting-someone',
    title: 'Meeting Someone New',
    category: 'Everyday',
    supportedLevels: ['A1', 'A2'],
    description: 'Introduce yourself, share hobbies and origin, and ask friendly questions to get to know a new acquaintance.',
    learnerGoal: 'Exchange names, occupations, hometowns, and simple personal interests.',
    aiRole: 'A friendly international student or colleague introducing themselves at a social gathering.',
    openingContext: 'The learner is attending an informal community meet-and-greet.',
    usefulExpressions: [
      { expression: 'Nice to meet you.', meaning: 'Rất vui được gặp bạn.', level: 'A1' },
      { expression: 'Where are you from?', meaning: 'Bạn đến từ đâu?', level: 'A1' },
      { expression: 'What do you do for fun?', meaning: 'Bạn thường làm gì lúc rảnh rỗi?', level: 'A2' },
      { expression: 'How long have you lived here?', meaning: 'Bạn đã sống ở đây bao lâu rồi?', level: 'A2' },
      { expression: 'It was great talking to you.', meaning: 'Nói chuyện với bạn rất vui.', level: 'A2' },
    ],
    tags: ['introduction', 'small-talk', 'social', 'greetings'],
    maxTurns: 8,
  },
  {
    id: 'asking-directions',
    title: 'Asking for Directions',
    category: 'Everyday',
    supportedLevels: ['A1', 'A2'],
    description: 'Ask for navigation help to find a landmark, subway station, or public building in a city.',
    learnerGoal: 'Politely ask a local for directions, confirm instructions, and say thank you.',
    aiRole: 'A friendly local resident walking on the sidewalk.',
    openingContext: 'The learner is looking for a nearby station or museum in an unfamiliar city.',
    usefulExpressions: [
      { expression: 'Excuse me, how do I get to the station?', meaning: 'Xin lỗi, làm sao để đi tới nhà ga?', level: 'A1' },
      { expression: 'Is it far from here?', meaning: 'Nó có xa đây không?', level: 'A1' },
      { expression: 'Turn left at the next corner.', meaning: 'Rẽ trái ở góc phố tiếp theo.', level: 'A1' },
      { expression: 'Is it within walking distance?', meaning: 'Có đi bộ tới đó được không?', level: 'A2' },
      { expression: 'Thank you for your help.', meaning: 'Cảm ơn sự giúp đỡ của bạn.', level: 'A1' },
    ],
    tags: ['directions', 'city', 'travel', 'navigation'],
    maxTurns: 8,
  },

  // ==========================================
  // 2. TRAVEL (4 scenarios)
  // ==========================================
  {
    id: 'airport-checkin',
    title: 'Airport Check-in',
    category: 'Travel',
    supportedLevels: ['A2', 'B1'],
    description: 'Check in for an international flight, choose seating, and handle luggage inquiries.',
    learnerGoal: 'Provide booking details, hand over passport, choose a seat preference (window/aisle), and check baggage.',
    aiRole: 'An airline check-in counter agent at an international airport.',
    openingContext: 'The learner approaches the airline check-in desk with luggage.',
    usefulExpressions: [
      { expression: 'Here is my passport and booking reference.', meaning: 'Đây là hộ chiếu và mã đặt chỗ của tôi.', level: 'A2' },
      { expression: 'I would prefer a window seat, please.', meaning: 'Tôi thích một ghế gần cửa sổ hơn, làm ơn.', level: 'A2' },
      { expression: 'How many bags are you checking in?', meaning: 'Bạn sẽ gửi bao nhiêu kiện hành lý?', level: 'A2' },
      { expression: 'Is there a layover on this flight?', meaning: 'Chuyến bay này có quá cảnh không?', level: 'B1' },
      { expression: 'What time will boarding start?', meaning: 'Mấy giờ sẽ bắt đầu lên máy bay?', level: 'B1' },
    ],
    tags: ['airport', 'flight', 'checkin', 'travel'],
    maxTurns: 8,
  },
  {
    id: 'hotel-reception',
    title: 'Hotel Reception',
    category: 'Travel',
    supportedLevels: ['A2', 'B1'],
    description: 'Check into a hotel, ask about breakfast and amenities, and request room preferences.',
    learnerGoal: 'Check in with a reservation name, ask about Wi-Fi and breakfast hours, and inquire about hotel facilities.',
    aiRole: 'A professional front-desk receptionist at a boutique hotel.',
    openingContext: 'The learner arrives at the hotel lobby to check into their room.',
    usefulExpressions: [
      { expression: 'I have a reservation under the name...', meaning: 'Tôi có đặt phòng trước dưới tên...', level: 'A2' },
      { expression: 'What time is breakfast served?', meaning: 'Bữa sáng phục vụ lúc mấy giờ?', level: 'A2' },
      { expression: 'Is Wi-Fi included in the room rate?', meaning: 'Giá phòng đã bao gồm Wi-Fi chưa?', level: 'A2' },
      { expression: 'Could I have a quiet room on a higher floor?', meaning: 'Cho tôi một phòng yên tĩnh ở tầng cao được không?', level: 'B1' },
      { expression: 'Could you arrange a taxi for tomorrow morning?', meaning: 'Bạn có thể đặt taxi cho sáng mai giúp tôi không?', level: 'B1' },
    ],
    tags: ['hotel', 'accommodation', 'hospitality', 'travel'],
    maxTurns: 8,
  },
  {
    id: 'train-station',
    title: 'Train Station Ticket Counter',
    category: 'Travel',
    supportedLevels: ['A2', 'B1'],
    description: 'Purchase train tickets, inquire about platform numbers, schedules, and train connections.',
    learnerGoal: 'Buy a one-way or round-trip ticket, ask about departure times, and verify the platform.',
    aiRole: 'A station ticket agent behind the information window.',
    openingContext: 'The learner is at a central railway station purchasing a ticket to another city.',
    usefulExpressions: [
      { expression: 'A round-trip ticket to Oxford, please.', meaning: 'Cho một vé khứ hồi đi Oxford, làm ơn.', level: 'A2' },
      { expression: 'Which platform does the train leave from?', meaning: 'Tàu khởi hành từ sân ga nào?', level: 'A2' },
      { expression: 'Is it a direct train or do I need to transfer?', meaning: 'Đây là tàu thẳng hay tôi phải chuyển tàu?', level: 'B1' },
      { expression: 'Are there any delays today?', meaning: 'Hôm nay có chuyến nào bị hoãn không?', level: 'B1' },
      { expression: 'When is the next departing train?', meaning: 'Khi nào chuyến tàu tiếp theo khởi hành?', level: 'B1' },
    ],
    tags: ['train', 'transport', 'tickets', 'travel'],
    maxTurns: 8,
  },
  {
    id: 'travel-problem',
    title: 'Handling a Travel Issue',
    category: 'Travel',
    supportedLevels: ['B1', 'B2'],
    description: 'Explain a lost luggage or delayed transport situation calmly and negotiate a practical solution.',
    learnerGoal: 'Describe a missing bag or missed connection, explain timeline, and request compensation or tracking updates.',
    aiRole: 'A customer service representative at a lost baggage or transit desk.',
    openingContext: 'The learner discovers their luggage did not arrive at the baggage carousel.',
    usefulExpressions: [
      { expression: 'My suitcase did not appear on the carousel.', meaning: 'Vali của tôi không xuất hiện trên băng chuyền.', level: 'B1' },
      { expression: 'Can I file a missing baggage report?', meaning: 'Tôi có thể làm biên bản thất lạc hành lý không?', level: 'B1' },
      { expression: 'How long does the tracing process usually take?', meaning: 'Quy trình tìm kiếm thường mất bao lâu?', level: 'B2' },
      { expression: 'Could you deliver it to my hotel once located?', meaning: 'Khi tìm thấy bạn có thể giao về khách sạn giúp tôi được không?', level: 'B2' },
      { expression: 'What is the reference number for tracking this claim?', meaning: 'Mã số hồ sơ để theo dõi yêu cầu này là gì?', level: 'B2' },
    ],
    tags: ['problem-solving', 'luggage', 'customer-service', 'travel'],
    maxTurns: 8,
  },

  // ==========================================
  // 3. STUDY (3 scenarios)
  // ==========================================
  {
    id: 'university-introduction',
    title: 'University Campus Introduction',
    category: 'Study',
    supportedLevels: ['B1', 'B2'],
    description: 'Meet an academic advisor or senior student on orientation day to discuss courses and campus life.',
    learnerGoal: 'Introduce your academic background, ask about major requirements, and discuss elective subjects.',
    aiRole: 'An academic peer advisor guiding new students during university orientation.',
    openingContext: 'The learner is visiting the university guidance office on orientation week.',
    usefulExpressions: [
      { expression: 'I am majoring in Computer Science.', meaning: 'Tôi đang học chuyên ngành Khoa học Máy tính.', level: 'B1' },
      { expression: 'Which electives would you recommend for this semester?', meaning: 'Bạn gợi ý những môn tự chọn nào cho kỳ này?', level: 'B1' },
      { expression: 'What are the prerequisites for this advanced course?', meaning: 'Điều kiện tiên quyết cho môn học nâng cao này là gì?', level: 'B2' },
      { expression: 'How is the workload balanced between lectures and labs?', meaning: 'Khối lượng học giữa lý thuyết và thực hành được cân đối thế nào?', level: 'B2' },
      { expression: 'Is there a study group or tutoring center available?', meaning: 'Có nhóm học tập hay trung tâm phụ đạo nào không?', level: 'B2' },
    ],
    tags: ['university', 'academics', 'orientation', 'study'],
    maxTurns: 8,
  },
  {
    id: 'group-project',
    title: 'Group Project Planning',
    category: 'Study',
    supportedLevels: ['B1', 'B2'],
    description: 'Collaborate with a classmate to divide research tasks, set deadlines, and plan a presentation.',
    learnerGoal: 'Propose a division of labor, agree on milestones, and give constructive input on team assignments.',
    aiRole: 'A motivated classmate collaborating on a joint research assignment.',
    openingContext: 'The learner and classmate meet in the library to plan a 15-minute presentation.',
    usefulExpressions: [
      { expression: 'Shall we divide the slides into two sections?', meaning: 'Chúng ta chia slide làm hai phần nhé?', level: 'B1' },
      { expression: 'I can take care of the background research.', meaning: 'Tôi có thể phụ trách phần nghiên cứu bối cảnh.', level: 'B1' },
      { expression: 'Let us set a deadline for the initial draft.', meaning: 'Hãy đặt hạn chót cho bản nháp đầu tiên.', level: 'B2' },
      { expression: 'What do you think about structuring the argument this way?', meaning: 'Bạn nghĩ sao về việc cấu trúc lập luận theo hướng này?', level: 'B2' },
      { expression: 'We should schedule a practice run before submitting.', meaning: 'Chúng ta nên xếp lịch tập thuyết trình trước khi nộp.', level: 'B2' },
    ],
    tags: ['teamwork', 'collaboration', 'planning', 'study'],
    maxTurns: 8,
  },
  {
    id: 'presentation-discussion',
    title: 'Post-Presentation Q&A',
    category: 'Study',
    supportedLevels: ['B2', 'C1'],
    description: 'Defend your research findings and respond to analytical questions from a seminar tutor.',
    learnerGoal: 'Clarify methodology, interpret key data points, and acknowledge limitations of a study.',
    aiRole: 'A knowledgeable university seminar tutor asking probing questions after a student presentation.',
    openingContext: 'The learner has just finished delivering a research presentation in an academic seminar.',
    usefulExpressions: [
      { expression: 'That is a very insightful question.', meaning: 'Đó là một câu hỏi rất sâu sắc.', level: 'B2' },
      { expression: 'Our findings indicate a clear correlation between the two variables.', meaning: 'Kết quả của chúng tôi chỉ ra mối tương quan rõ ràng giữa hai biến số.', level: 'B2' },
      { expression: 'While our sample size was limited, the trend remains consistent.', meaning: 'Dù cỡ mẫu còn hạn chế, xu hướng vẫn rất nhất quán.', level: 'C1' },
      { expression: 'Further research would be necessary to establish causation.', meaning: 'Cần nghiên cứu thêm để xác định mối quan hệ nhân quả.', level: 'C1' },
      { expression: 'To address your point regarding methodology...', meaning: 'Để trả lời ý kiến của thầy/cô về phương pháp luận...', level: 'C1' },
    ],
    tags: ['seminar', 'research', 'critical-thinking', 'presentation'],
    maxTurns: 8,
  },

  // ==========================================
  // 4. WORK (4 scenarios)
  // ==========================================
  {
    id: 'job-interview',
    title: 'Job Interview',
    category: 'Work',
    supportedLevels: ['B1', 'B2'],
    description: 'Answer behavioral and professional questions about your background, achievements, and work style.',
    learnerGoal: 'Highlight relevant experience, describe how you solved a workplace challenge, and ask a thoughtful question.',
    aiRole: 'A professional hiring manager conducting a first-round behavioral interview.',
    openingContext: 'The learner is attending an interview for an exciting new professional role.',
    usefulExpressions: [
      { expression: 'In my previous position, I was responsible for...', meaning: 'Ở vị trí trước đây, tôi chịu trách nhiệm về...', level: 'B1' },
      { expression: 'One challenge I overcame was...', meaning: 'Một thử thách tôi đã vượt qua là...', level: 'B1' },
      { expression: 'I believe my strength lies in analytical problem-solving.', meaning: 'Tôi tin thế mạnh của mình nằm ở khả năng giải quyết vấn đề phân tích.', level: 'B2' },
      { expression: 'Could you tell me more about the team culture?', meaning: 'Bạn có thể chia sẻ thêm về văn hóa đội ngũ không?', level: 'B2' },
      { expression: 'I am enthusiastic about this opportunity because...', meaning: 'Tôi rất hào hứng với cơ hội này vì...', level: 'B2' },
    ],
    tags: ['interview', 'career', 'professional', 'work'],
    maxTurns: 8,
  },
  {
    id: 'work-meeting',
    title: 'Team Sprint Planning Meeting',
    category: 'Work',
    supportedLevels: ['B2', 'C1'],
    description: 'Participate in a team planning session, voice opinions on sprint capacity, and agree on deliverables.',
    learnerGoal: 'Contribute constructively to a team discussion, challenge an unrealistic timeline, and propose solutions.',
    aiRole: 'A product manager leading a collaborative team sprint planning meeting.',
    openingContext: 'The team is reviewing project priorities and allocating tasks for the upcoming cycle.',
    usefulExpressions: [
      { expression: 'From my perspective, that timeline might be overly ambitious.', meaning: 'Theo góc nhìn của tôi, tiến độ đó có thể hơi quá sức.', level: 'B2' },
      { expression: 'I suggest we prioritize the core features first.', meaning: 'Tôi đề xuất chúng ta ưu tiên các tính năng cốt lõi trước.', level: 'B2' },
      { expression: 'Could we clarify the dependencies before committing to this?', meaning: 'Chúng ta có thể làm rõ các điểm phụ thuộc trước khi cam kết không?', level: 'C1' },
      { expression: 'Let us align on the acceptance criteria for this deliverable.', meaning: 'Hãy thống nhất tiêu chí nghiệm thu cho sản phẩm bàn giao này.', level: 'C1' },
      { expression: 'I can take ownership of coordinating with engineering.', meaning: 'Tôi có thể đứng ra phụ trách việc phối hợp với đội kỹ thuật.', level: 'C1' },
    ],
    tags: ['meeting', 'sprint', 'workplace', 'business'],
    maxTurns: 8,
  },
  {
    id: 'client-conversation',
    title: 'Consulting with a Client',
    category: 'Work',
    supportedLevels: ['B2', 'C1'],
    description: 'Discuss client requirements, manage expectations professionally, and outline project deliverables.',
    learnerGoal: 'Understand client needs, clarify ambiguities politely, and establish trusted advisory rapport.',
    aiRole: 'A corporate client seeking advice and a roadmap for their business project.',
    openingContext: 'The learner is meeting a new client to discuss project scope and milestones.',
    usefulExpressions: [
      { expression: 'To ensure we are on the same page...', meaning: 'Để đảm bảo chúng ta cùng chung cách hiểu...', level: 'B2' },
      { expression: 'What key outcome are you hoping to achieve by Q3?', meaning: 'Kết quả then chốt nào bạn kỳ vọng đạt được vào quý 3?', level: 'B2' },
      { expression: 'We can tailor the scope to fit within your budget constraints.', meaning: 'Chúng tôi có thể điều chỉnh phạm vi để phù hợp với ngân sách của bạn.', level: 'C1' },
      { expression: 'I would recommend adopting a phased rollout strategy.', meaning: 'Tôi khuyên nên áp dụng chiến lược triển khai theo từng giai đoạn.', level: 'C1' },
      { expression: 'We will provide regular status updates to maintain transparency.', meaning: 'Chúng tôi sẽ cập nhật tiến độ định kỳ để đảm bảo tính minh bạch.', level: 'C1' },
    ],
    tags: ['client', 'consulting', 'business', 'negotiation'],
    maxTurns: 8,
  },
  {
    id: 'giving-an-update',
    title: 'Project Status Update to Leadership',
    category: 'Work',
    supportedLevels: ['B2', 'C1'],
    description: 'Deliver an executive summary of project progress, address blockers, and propose mitigation steps.',
    learnerGoal: 'Provide a crisp overview of completed milestones, explain an unexpected risk, and present a mitigation plan.',
    aiRole: 'A senior executive listening to a weekly project briefing.',
    openingContext: 'The learner is delivering a brief executive summary to a senior director.',
    usefulExpressions: [
      { expression: 'Overall, the initiative remains on track with our primary milestones.', meaning: 'Nhìn chung, sáng kiến vẫn đang đi đúng tiến độ các mốc chính.', level: 'B2' },
      { expression: 'We encountered a minor bottleneck regarding third-party integration.', meaning: 'Chúng tôi gặp một nút thắt nhỏ liên quan đến tích hợp bên thứ ba.', level: 'B2' },
      { expression: 'To mitigate this risk, we have reallocated resources.', meaning: 'Để giảm thiểu rủi ro này, chúng tôi đã tái phân bổ nguồn lực.', level: 'C1' },
      { expression: 'Our primary metric shows a twenty percent improvement in efficiency.', meaning: 'Chỉ số chính của chúng tôi cho thấy hiệu suất tăng 20%.', level: 'C1' },
      { expression: 'I welcome any questions or strategic guidance you may have.', meaning: 'Tôi rất hoan nghênh mọi câu hỏi hoặc chỉ đạo chiến lược từ anh/chị.', level: 'C1' },
    ],
    tags: ['executive', 'status-report', 'leadership', 'communication'],
    maxTurns: 8,
  },

  // ==========================================
  // 5. ADVANCED (4 scenarios)
  // ==========================================
  {
    id: 'technology-discussion',
    title: 'Ethics of Artificial Intelligence',
    category: 'Advanced',
    supportedLevels: ['B2', 'C1', 'C2'],
    description: 'Engage in a nuanced discussion on the societal, economic, and ethical implications of generative AI.',
    learnerGoal: 'Articulate balanced viewpoints, evaluate trade-offs between innovation and regulation, and defend your stance.',
    aiRole: 'A technology policy analyst and researcher engaging in a deep philosophical dialogue.',
    openingContext: 'The learner is participating in a roundtable discussion on emerging technologies.',
    usefulExpressions: [
      { expression: 'It is essential to strike a balance between innovation and oversight.', meaning: 'Việc cân bằng giữa đổi mới và quản lý giám sát là điều cốt yếu.', level: 'B2' },
      { expression: 'The rapid proliferation of AI raises legitimate copyright concerns.', meaning: 'Sự phổ biến nhanh chóng của AI làm dấy lên những lo ngại chính đáng về bản quyền.', level: 'C1' },
      { expression: 'One must scrutinize the underlying algorithmic biases.', meaning: 'Người ta phải xem xét kỹ lưỡng các định kiến thuật toán tiềm ẩn.', level: 'C1' },
      { expression: 'This paradigm shift will inevitably reshape labor dynamics.', meaning: 'Sự thay đổi mô hình này chắc chắn sẽ định hình lại thị trường lao động.', level: 'C2' },
      { expression: 'Proponents argue it boosts productivity, whereas critics point to societal risks.', meaning: 'Những người ủng hộ cho rằng nó tăng năng suất, trong khi giới phê bình chỉ ra các rủi ro xã hội.', level: 'C2' },
    ],
    tags: ['ai', 'technology', 'ethics', 'debate'],
    maxTurns: 8,
  },
  {
    id: 'environmental-debate',
    title: 'Sustainable Energy Transition',
    category: 'Advanced',
    supportedLevels: ['C1', 'C2'],
    description: 'Debate the viability, economic feasibility, and geopolitical impact of transitioning to renewable energy.',
    learnerGoal: 'Weigh empirical evidence, address economic counter-arguments, and present a pragmatic policy vision.',
    aiRole: 'An environmental economist evaluating policy proposals at an international sustainability forum.',
    openingContext: 'The learner is representing a think-tank panel on climate change and green transition.',
    usefulExpressions: [
      { expression: 'The transition requires substantial upfront capital expenditure.', meaning: 'Quá trình chuyển đổi đòi hỏi chi phí vốn đầu tư ban đầu rất lớn.', level: 'C1' },
      { expression: 'Decarbonization is not merely an ecological imperative, but an economic opportunity.', meaning: 'Khử carbon không chỉ là mệnh lệnh sinh thái mà còn là cơ hội kinh tế.', level: 'C1' },
      { expression: 'Grid infrastructure remains the fundamental bottleneck to scalability.', meaning: 'Hạ tầng lưới điện vẫn là nút thắt cơ bản đối với khả năng mở rộng quy mô.', level: 'C2' },
      { expression: 'Subsidizing fossil fuels creates perverse incentives in the market.', meaning: 'Việc trợ cấp nhiên liệu hóa thạch tạo ra những động lực lệch lạc trên thị trường.', level: 'C2' },
      { expression: 'A holistic framework must incorporate both mitigation and adaptation strategies.', meaning: 'Một khuôn khổ toàn diện phải kết hợp cả chiến lược giảm thiểu và thích ứng.', level: 'C2' },
    ],
    tags: ['environment', 'energy', 'policy', 'debate'],
    maxTurns: 8,
  },
  {
    id: 'business-negotiation',
    title: 'High-Stakes Partnership Negotiation',
    category: 'Advanced',
    supportedLevels: ['C1', 'C2'],
    description: 'Negotiate contract terms, exclusivity clauses, and revenue share with a strategic international partner.',
    learnerGoal: 'Protect core business interests, explore concessions creatively, and build a win-win partnership.',
    aiRole: 'A seasoned commercial negotiator representing a prospective strategic partner.',
    openingContext: 'The learner is leading negotiations to finalize a cross-border distribution agreement.',
    usefulExpressions: [
      { expression: 'We are willing to consider flexibility on licensing fees provided exclusivity is granted.', meaning: 'Chúng tôi sẵn sàng linh hoạt về phí bản quyền với điều kiện được độc quyền.', level: 'C1' },
      { expression: 'That clause represents a significant departure from standard industry practice.', meaning: 'Điều khoản đó khác biệt đáng kể so với thông lệ tiêu chuẩn ngành.', level: 'C1' },
      { expression: 'Let us explore a tiered commission structure to bridge the gap.', meaning: 'Hãy cùng tìm hiểu cấu trúc hoa hồng theo bậc để thu hẹp khoảng cách.', level: 'C2' },
      { expression: 'Our paramount priority is preserving brand equity across regional markets.', meaning: 'Ưu tiên tối thượng của chúng tôi là bảo vệ giá trị thương hiệu trên các thị trường khu vực.', level: 'C2' },
      { expression: 'Subject to board approval, we are prepared to accept those stipulations.', meaning: 'Tùy thuộc vào sự phê duyệt của Hội đồng quản trị, chúng tôi sẵn sàng chấp nhận các điều khoản đó.', level: 'C2' },
    ],
    tags: ['negotiation', 'contracts', 'partnership', 'business'],
    maxTurns: 8,
  },
  {
    id: 'academic-discussion',
    title: 'Linguistic Relativity & Cognitive Science',
    category: 'Advanced',
    supportedLevels: ['C1', 'C2'],
    description: 'Examine the Sapir-Whorf hypothesis and discuss whether language shapes thought and perception.',
    learnerGoal: 'Analyze theoretical frameworks, cite counter-examples from cognitive linguistics, and synthesize conclusions.',
    aiRole: 'A cognitive linguistics professor chairing a graduate research symposium.',
    openingContext: 'The learner is participating in a graduate research seminar on cognitive science.',
    usefulExpressions: [
      { expression: 'The weak version of the hypothesis posits that language influences, rather than determines, cognition.', meaning: 'Phiên bản yếu của giả thuyết cho rằng ngôn ngữ ảnh hưởng chứ không quyết định nhận thức.', level: 'C1' },
      { expression: 'Cross-cultural empirical studies offer compelling insights into spatial categorization.', meaning: 'Các nghiên cứu thực nghiệm liên văn hóa mang lại cái nhìn sâu sắc về phân loại không gian.', level: 'C1' },
      { expression: 'One must distinguish between perceptual constraints and lexical availability.', meaning: 'Người ta phải phân biệt giữa giới hạn tri giác và tính sẵn có của từ vựng.', level: 'C2' },
      { expression: 'Universalist frameworks contend that core conceptual structures are innate.', meaning: 'Các khuôn khổ phổ quát luận cho rằng các cấu trúc khái niệm cốt lõi là bẩm sinh.', level: 'C2' },
      { expression: 'This empirical evidence nuances the classical dichotomy between nature and nurture.', meaning: 'Bằng chứng thực nghiệm này làm sắc thái hóa sự đối lập cổ điển giữa bản năng và nuôi dưỡng.', level: 'C2' },
    ],
    tags: ['linguistics', 'cognition', 'philosophy', 'academics'],
    maxTurns: 8,
  },
];

/**
 * Helper to fetch a scenario by its unique ID.
 */
export function getScenarioById(id: string): ConversationScenario | undefined {
  return CONVERSATION_SCENARIOS.find((s) => s.id === id);
}

/**
 * Returns static opening message for a scenario without calling Gemini.
 */
export function getScenarioOpeningMessage(scenarioId: string, level: string): string {
  switch (scenarioId) {
    case 'coffee-shop':
      return 'Good morning! Welcome to the cafe. What can I get started for you today?';
    case 'restaurant':
      return 'Good evening! Welcome to our restaurant. How many are in your party today?';
    case 'shopping':
      return 'Hello! Let me know if you are looking for anything in particular, or if you would like to try anything on.';
    case 'meeting-someone':
      return 'Hi there! Nice to meet you. Are you enjoying the event so far?';
    case 'asking-directions':
      return 'Hello! Yes, I know this neighborhood quite well. Where are you trying to go?';
    case 'airport-checkin':
      return 'Good day. Welcome to the check-in desk. May I please see your passport and ticket confirmation?';
    case 'hotel-reception':
      return 'Good evening and welcome to the hotel! Are you checking in today?';
    case 'train-station':
      return 'Next in line, please! Where are you traveling today?';
    case 'travel-problem':
      return 'Hello, baggage services desk. I understand there is an issue with your luggage. Could you describe what happened?';
    case 'university-introduction':
      return 'Hi! Welcome to campus orientation. What degree program or courses are you planning to study?';
    case 'group-project':
      return 'Hey! Thanks for meeting up. We have about two weeks to finish this project. How do you think we should divide the work?';
    case 'presentation-discussion':
      return 'Thank you for that thorough presentation. I found your preliminary data interesting. Could you clarify how you selected your sample group?';
    case 'job-interview':
      return 'Welcome! Thank you for taking the time to speak with us today. To start off, could you tell me a little about yourself and your background?';
    case 'work-meeting':
      return 'Alright team, let us review our sprint objectives. We have several high-priority deliverables this week. How is everyone feeling about the scope?';
    case 'client-conversation':
      return 'Thank you for taking the time to meet with us today. To get started, could you share the main goals you are hoping to achieve with this project?';
    case 'giving-an-update':
      return 'Thanks for joining. I would like to get a brief update on where the project currently stands and any potential risks on the horizon.';
    case 'technology-discussion':
      return 'Welcome to our discussion on artificial intelligence. With models advancing so rapidly, do you believe the primary focus should be on acceleration or regulatory guardrails?';
    case 'environmental-debate':
      return 'Welcome to the panel. As we assess the feasibility of net-zero targets, what do you see as the single greatest bottleneck in transitioning to renewables?';
    case 'business-negotiation':
      return 'Thank you for meeting with us. We have reviewed your draft proposal. While we are eager to partner, there are several commercial terms we need to align on.';
    case 'academic-discussion':
      return 'Welcome to the seminar. Today we are investigating how linguistic structures interact with cognitive processing. What is your assessment of the current empirical evidence?';
    default:
      return `Hello! I am your conversation partner for this scenario (${level}). What would you like to say?`;
  }
}
