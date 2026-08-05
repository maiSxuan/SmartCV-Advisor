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
    summary: 'Đánh giá phần tóm tắt hồ sơ có định vị đúng vai trò, nêu kỹ năng trọng tâm và điểm nổi bật hay không.',
    criteria: [
      '0 điểm nếu thiếu phần này.',
      'Tối đa 2 điểm: viết rõ ràng, ngắn gọn, đúng vai trò ứng tuyển.',
      'Tối đa 3 điểm: nêu được định hướng hoặc chuyên môn liên quan trực tiếp đến vai trò.',
      'Tối đa 3 điểm: có nhắc kỹ năng hoặc công nghệ trọng tâm của vai trò.',
      'Tối đa 2 điểm: có kết quả, kinh nghiệm hoặc điểm mạnh nổi bật.',
    ],
    subScores: [
      { label: 'Rõ ràng và đúng vai trò', maxScore: 2, description: 'Tóm tắt ngắn gọn, dễ hiểu và bám sát vị trí ứng tuyển.' },
      { label: 'Định hướng chuyên môn', maxScore: 3, description: 'Thể hiện chuyên môn hoặc định hướng liên quan trực tiếp đến vai trò.' },
      { label: 'Kỹ năng trọng tâm', maxScore: 3, description: 'Nhắc đúng kỹ năng hoặc công nghệ quan trọng của vị trí mục tiêu.' },
      { label: 'Kết quả hoặc điểm nổi bật', maxScore: 2, description: 'Có dấu hiệu về kinh nghiệm, kết quả hoặc điểm mạnh đáng chú ý.' },
    ],
  },
  {
    section: 'Education',
    label: 'Học vấn',
    maxScore: 10,
    summary: 'Đánh giá thông tin trường, ngành, môn học, đồ án và thành tích học thuật liên quan đến vị trí mục tiêu.',
    criteria: [
      '0 điểm nếu thiếu phần này.',
      'Tối đa 4 điểm: có trường, ngành, bậc học, thời gian học rõ ràng.',
      'Tối đa 3 điểm: môn học hoặc đồ án liên quan đến vai trò.',
      'Tối đa 2 điểm: GPA, giải thưởng, học bổng, thành tích học thuật nếu có.',
      'Tối đa 1 điểm: trình bày dễ đọc, không mơ hồ.',
    ],
    subScores: [
      { label: 'Thông tin học vấn chính', maxScore: 4, description: 'Có trường, ngành, bậc học và thời gian học rõ ràng.' },
      { label: 'Môn học hoặc đồ án liên quan', maxScore: 3, description: 'Môn học hoặc đồ án hỗ trợ trực tiếp cho vai trò.' },
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
      '0 điểm nếu thiếu phần này.',
      'Tối đa 6 điểm: kinh nghiệm liên quan trực tiếp đến vai trò mục tiêu.',
      'Tối đa 5 điểm: mô tả trách nhiệm gắn với kỹ năng quan trọng.',
      'Tối đa 4 điểm: có kết quả đo lường được, tác động hoặc phạm vi hệ thống.',
      'Tối đa 3 điểm: thể hiện quyền chủ động, cấp độ chuyên môn, khả năng làm việc nhóm hoặc bối cảnh lĩnh vực.',
      'Tối đa 2 điểm: thời gian, công ty và chức danh rõ ràng.',
    ],
    subScores: [
      { label: 'Mức liên quan đến vai trò', maxScore: 6, description: 'Kinh nghiệm gắn trực tiếp với vị trí mục tiêu.' },
      { label: 'Trách nhiệm và kỹ năng quan trọng', maxScore: 5, description: 'Mô tả trách nhiệm có liên hệ với các kỹ năng quan trọng.' },
      { label: 'Kết quả hoặc phạm vi', maxScore: 4, description: 'Có số liệu, tác động, phạm vi hệ thống hoặc kết quả đo lường được.' },
      { label: 'Vai trò cá nhân và ngữ cảnh', maxScore: 3, description: 'Thể hiện vai trò cá nhân, cấp độ chuyên môn, khả năng làm việc nhóm hoặc bối cảnh lĩnh vực.' },
      { label: 'Thông tin thời gian', maxScore: 2, description: 'Tên công ty, vị trí và thời gian làm việc rõ ràng.' },
    ],
  },
  {
    section: 'Projects',
    label: 'Dự án',
    maxScore: 15,
    summary: 'Đánh giá dự án có chứng minh kỹ năng quan trọng, chiều sâu kỹ thuật, kết quả và vai trò cá nhân hay không.',
    criteria: [
      '0 điểm nếu thiếu phần này.',
      'Tối đa 5 điểm: dự án liên quan trực tiếp đến vai trò và kỹ năng quan trọng.',
      'Tối đa 4 điểm: có chiều sâu kỹ thuật như kiến trúc, API, mô hình, cơ sở dữ liệu hoặc triển khai.',
      'Tối đa 3 điểm: có kết quả, bản minh họa, GitHub, số liệu, người dùng hoặc bản triển khai.',
      'Tối đa 3 điểm: nêu rõ vai trò cá nhân, bài toán, và giải pháp.',
    ],
    subScores: [
      { label: 'Độ liên quan của dự án', maxScore: 5, description: 'Dự án chứng minh đúng kỹ năng quan trọng của vai trò.' },
      { label: 'Độ sâu kỹ thuật', maxScore: 4, description: 'Có kiến trúc, API, mô hình, cơ sở dữ liệu, bản triển khai hoặc chi tiết kỹ thuật tương đương.' },
      { label: 'Kết quả và liên kết kiểm chứng', maxScore: 3, description: 'Có số liệu, người dùng, bản minh họa, GitHub hoặc bản triển khai.' },
      { label: 'Vai trò cá nhân và giải pháp', maxScore: 3, description: 'Nêu rõ bài toán, vai trò cá nhân và cách giải quyết.' },
    ],
  },
  {
    section: 'Technical Skills',
    label: 'Kỹ năng kỹ thuật',
    maxScore: 35,
    summary: 'Đánh giá kỹ năng theo mức ưu tiên của vai trò và bằng chứng xuất hiện trong CV.',
    criteria: [
      '0 điểm nếu thiếu hoàn toàn bằng chứng kỹ năng.',
      'Kỹ năng kỹ thuật là phần quan trọng nhất, tối đa 35 điểm.',
      'Chấm theo mức ưu tiên của kỹ năng: 3 = bắt buộc, 2 = quan trọng, 1 = bổ trợ, 0 = không tính điểm.',
      'Mức 3 chiếm 60% điểm kỹ năng kỹ thuật, mức 2 chiếm 30%, mức 1 chiếm 10%.',
      'Mức bằng chứng cho từng kỹ năng: 0 = không thấy; 1 = nhắc mơ hồ; 2 = liệt kê rõ trong kỹ năng, chứng chỉ hoặc khóa học; 3 = có dùng trong dự án hoặc kinh nghiệm với ngữ cảnh cụ thể.',
      'Tên sản phẩm AI như ChatGPT, Claude, Codex, Gemini chỉ thể hiện biết dùng công cụ, không tự động được tính là kỹ năng AI tạo sinh, LLM hoặc kỹ thuật viết câu lệnh nếu thiếu bằng chứng kỹ thuật.',
      'Nếu thiếu phần Kỹ năng kỹ thuật nhưng kỹ năng xuất hiện trong Kinh nghiệm hoặc Dự án, hệ thống vẫn ghi nhận nhưng điểm Kỹ năng kỹ thuật tối đa 70%.',
    ],
    subScores: [
      { label: 'Kỹ năng bắt buộc (mức 3)', maxScore: 21, description: 'Nhóm kỹ năng cốt lõi chiếm 60% điểm kỹ năng chuyên môn.' },
      { label: 'Kỹ năng quan trọng (mức 2)', maxScore: 10.5, description: 'Nhóm kỹ năng hỗ trợ quan trọng chiếm 30% điểm kỹ năng chuyên môn.' },
      { label: 'Kỹ năng bổ trợ (mức 1)', maxScore: 3.5, description: 'Nhóm kỹ năng cộng thêm chiếm 10% điểm kỹ năng chuyên môn.' },
    ],
  },
  {
    section: 'Certifications',
    label: 'Chứng chỉ',
    maxScore: 10,
    summary: 'Đánh giá chứng chỉ hoặc khóa học có liên quan, có bù khoảng trống kỹ năng và có thông tin xác thực rõ ràng hay không.',
    criteria: [
      '0 điểm nếu thiếu phần này.',
      'Tối đa 5 điểm: chứng chỉ hoặc khóa học liên quan trực tiếp đến vai trò.',
      'Tối đa 3 điểm: chứng chỉ bù vào kỹ năng bắt buộc hoặc quan trọng đang thiếu.',
      'Tối đa 2 điểm: đơn vị cấp, thời gian, mã xác thực hoặc liên kết rõ ràng và đáng tin.',
    ],
    subScores: [
      { label: 'Độ liên quan chứng chỉ', maxScore: 5, description: 'Chứng chỉ hoặc khóa học liên quan trực tiếp đến vai trò.' },
      { label: 'Bù khoảng trống kỹ năng', maxScore: 3, description: 'Chứng chỉ hỗ trợ kỹ năng bắt buộc hoặc quan trọng còn thiếu.' },
      { label: 'Thông tin xác thực', maxScore: 2, description: 'Đơn vị cấp, thời gian, mã xác thực hoặc liên kết rõ ràng và đáng tin.' },
    ],
  },
];

