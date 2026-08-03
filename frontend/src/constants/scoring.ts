export interface SectionScoreGuide {
  section: string;
  label: string;
  maxScore: number;
  summary: string;
  criteria: string[];
  subScores: Array<{
    label: string;
    maxScore: number;
    description: string;
  }>;
}

export const sectionScoreGuides: SectionScoreGuide[] = [
  {
    section: 'Professional Summary',
    label: 'Giới thiệu chuyên môn',
    maxScore: 10,
    summary: 'Đánh giá phần tóm tắt hồ sơ có định vị đúng role, nêu kỹ năng trọng tâm và điểm nổi bật hay không.',
    criteria: [
      '0 điểm nếu thiếu section.',
      'Tối đa 2 điểm: viết rõ ràng, ngắn gọn, đúng vai trò ứng tuyển.',
      'Tối đa 3 điểm: nêu được định hướng hoặc chuyên môn liên quan trực tiếp role.',
      'Tối đa 3 điểm: có nhắc kỹ năng/công nghệ trọng tâm của role.',
      'Tối đa 2 điểm: có dấu hiệu về impact, kinh nghiệm, hoặc điểm mạnh nổi bật.',
    ],
    subScores: [
      { label: 'Rõ ràng và đúng vai trò', maxScore: 2, description: 'Tóm tắt ngắn gọn, dễ hiểu và bám sát vị trí ứng tuyển.' },
      { label: 'Định hướng chuyên môn', maxScore: 3, description: 'Thể hiện chuyên môn hoặc định hướng liên quan trực tiếp đến role.' },
      { label: 'Kỹ năng trọng tâm', maxScore: 3, description: 'Nhắc đúng kỹ năng hoặc công nghệ quan trọng của vị trí mục tiêu.' },
      { label: 'Impact hoặc điểm nổi bật', maxScore: 2, description: 'Có dấu hiệu về kinh nghiệm, kết quả, impact hoặc điểm mạnh đáng chú ý.' },
    ],
  },
  {
    section: 'Education',
    label: 'Học vấn',
    maxScore: 10,
    summary: 'Đánh giá thông tin trường, ngành, môn học, đồ án và thành tích học thuật liên quan đến vị trí mục tiêu.',
    criteria: [
      '0 điểm nếu thiếu section.',
      'Tối đa 4 điểm: có trường, ngành, bậc học, thời gian học rõ ràng.',
      'Tối đa 3 điểm: coursework/đồ án/môn học liên quan đến role.',
      'Tối đa 2 điểm: GPA, giải thưởng, học bổng, thành tích học thuật nếu có.',
      'Tối đa 1 điểm: trình bày dễ đọc, không mơ hồ.',
    ],
    subScores: [
      { label: 'Thông tin học vấn chính', maxScore: 4, description: 'Có trường, ngành, bậc học và thời gian học rõ ràng.' },
      { label: 'Môn học hoặc đồ án liên quan', maxScore: 3, description: 'Coursework, đồ án hoặc môn học hỗ trợ trực tiếp cho role.' },
      { label: 'Thành tích học thuật', maxScore: 2, description: 'GPA, giải thưởng, học bổng hoặc thành tích học thuật nếu có.' },
      { label: 'Độ dễ đọc', maxScore: 1, description: 'Thông tin được trình bày rõ ràng, không mơ hồ.' },
    ],
  },
  {
    section: 'Experience',
    label: 'Kinh nghiệm',
    maxScore: 20,
    summary: 'Đánh giá mức độ liên quan của kinh nghiệm, trách nhiệm thực tế, kết quả và phạm vi đóng góp.',
    criteria: [
      '0 điểm nếu thiếu section.',
      'Tối đa 6 điểm: kinh nghiệm liên quan trực tiếp đến role mục tiêu.',
      'Tối đa 5 điểm: mô tả trách nhiệm gắn với skill_score quan trọng.',
      'Tối đa 4 điểm: có kết quả đo lường được, impact, hoặc phạm vi hệ thống.',
      'Tối đa 3 điểm: thể hiện ownership, seniority, teamwork, hoặc domain context.',
      'Tối đa 2 điểm: timeline, company, title rõ ràng.',
    ],
    subScores: [
      { label: 'Mức liên quan đến role', maxScore: 6, description: 'Kinh nghiệm gắn trực tiếp với vị trí mục tiêu.' },
      { label: 'Trách nhiệm và kỹ năng quan trọng', maxScore: 5, description: 'Mô tả trách nhiệm có liên hệ với các skill_score quan trọng.' },
      { label: 'Kết quả hoặc phạm vi', maxScore: 4, description: 'Có số liệu, impact, phạm vi hệ thống hoặc kết quả đo lường được.' },
      { label: 'Ownership và ngữ cảnh', maxScore: 3, description: 'Thể hiện vai trò cá nhân, seniority, teamwork hoặc domain context.' },
      { label: 'Thông tin timeline', maxScore: 2, description: 'Tên công ty, vị trí và thời gian làm việc rõ ràng.' },
    ],
  },
  {
    section: 'Projects',
    label: 'Dự án',
    maxScore: 15,
    summary: 'Đánh giá project có chứng minh skill quan trọng, chiều sâu kỹ thuật, kết quả và vai trò cá nhân hay không.',
    criteria: [
      '0 điểm nếu thiếu section.',
      'Tối đa 5 điểm: project liên quan trực tiếp role và skill_score quan trọng.',
      'Tối đa 4 điểm: có technical depth như architecture, API, model, database, deployment.',
      'Tối đa 3 điểm: có kết quả, demo, GitHub, metric, user, hoặc deployment.',
      'Tối đa 3 điểm: nêu rõ vai trò cá nhân, bài toán, và giải pháp.',
    ],
    subScores: [
      { label: 'Độ liên quan của project', maxScore: 5, description: 'Project chứng minh đúng kỹ năng quan trọng của role.' },
      { label: 'Độ sâu kỹ thuật', maxScore: 4, description: 'Có architecture, API, model, database, deployment hoặc chi tiết kỹ thuật tương đương.' },
      { label: 'Kết quả và link kiểm chứng', maxScore: 3, description: 'Có metric, user, demo, GitHub hoặc deployment.' },
      { label: 'Vai trò cá nhân và giải pháp', maxScore: 3, description: 'Nêu rõ bài toán, vai trò cá nhân và cách giải quyết.' },
    ],
  },
  {
    section: 'Technical Skills',
    label: 'Kỹ năng kỹ thuật',
    maxScore: 35,
    summary: 'Đánh giá kỹ năng theo mức ưu tiên của role và mức bằng chứng xuất hiện trong CV.',
    criteria: [
      '0 điểm nếu thiếu hoàn toàn bằng chứng kỹ năng.',
      'Technical Skills là section quan trọng nhất, tối đa 35 điểm.',
      'Chấm theo skill_scores của role: 3 = bắt buộc, 2 = quan trọng, 1 = nice to have, 0 = không tính điểm.',
      'Skill_score 3 chiếm 60% điểm Technical Skills, skill_score 2 chiếm 30%, skill_score 1 chiếm 10%.',
      'Mức bằng chứng cho từng skill: 0 = không thấy; 1 = nhắc mơ hồ; 2 = liệt kê rõ trong skills/cert/course; 3 = có dùng trong project/experience với ngữ cảnh cụ thể.',
      'Tên sản phẩm AI như ChatGPT, Claude, Codex, Gemini chỉ thể hiện biết dùng công cụ, không tự động tính là skill Generative AI/LLM/Prompt Engineering nếu thiếu bằng chứng kỹ thuật.',
      'Nếu thiếu section Technical Skills nhưng skill xuất hiện ở Experience/Projects, vẫn ghi nhận nhưng điểm Technical Skills tối đa 70%.',
    ],
    subScores: [
      { label: 'Kỹ năng bắt buộc (skill_score 3)', maxScore: 21, description: 'Nhóm kỹ năng cốt lõi chiếm 60% điểm Technical Skills.' },
      { label: 'Kỹ năng quan trọng (skill_score 2)', maxScore: 10.5, description: 'Nhóm kỹ năng hỗ trợ quan trọng chiếm 30% điểm Technical Skills.' },
      { label: 'Nice-to-have (skill_score 1)', maxScore: 3.5, description: 'Nhóm kỹ năng cộng thêm chiếm 10% điểm Technical Skills.' },
    ],
  },
  {
    section: 'Certifications',
    label: 'Chứng chỉ',
    maxScore: 10,
    summary: 'Đánh giá chứng chỉ hoặc khóa học có liên quan, có bù skill gap và có thông tin xác thực rõ ràng hay không.',
    criteria: [
      '0 điểm nếu thiếu section.',
      'Tối đa 5 điểm: chứng chỉ/khóa học liên quan trực tiếp role.',
      'Tối đa 3 điểm: chứng chỉ bù vào skill bắt buộc hoặc quan trọng đang thiếu.',
      'Tối đa 2 điểm: issuer, thời gian, credential/link rõ ràng và đáng tin.',
    ],
    subScores: [
      { label: 'Độ liên quan chứng chỉ', maxScore: 5, description: 'Chứng chỉ hoặc khóa học liên quan trực tiếp role.' },
      { label: 'Bù vào skill gap', maxScore: 3, description: 'Chứng chỉ hỗ trợ kỹ năng bắt buộc hoặc quan trọng còn thiếu.' },
      { label: 'Thông tin xác thực', maxScore: 2, description: 'Issuer, thời gian, credential hoặc link rõ ràng và đáng tin.' },
    ],
  },
];

