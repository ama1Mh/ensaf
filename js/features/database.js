/**
 * ENSAF Database
 * Contains all subjects, questions, answers, hints, and lesson content
 */
const DB = {
  // ── SUBJECTS ──────────────────────────────────────────────
  subjects: [
    { id: 'math', name: { ar: 'الرياضيات', en: 'Mathematics', zh: '数学' }, icon: 'calculate', color: 'cy' },
    { id: 'sci',  name: { ar: 'العلوم', en: 'Science', zh: '科学' }, icon: 'science', color: 'gr' },
    { id: 'hist', name: { ar: 'التاريخ', en: 'History', zh: '历史' }, icon: 'history_edu', color: 'vi' },
    { id: 'geo',  name: { ar: 'الجغرافيا', en: 'Geography', zh: '地理' }, icon: 'public', color: 'bl' },
    { id: 'lit',  name: { ar: 'الأدب', en: 'Literature', zh: '文学' }, icon: 'menu_book', color: 'go' },
    { id: 'bio',  name: { ar: 'الأحياء', en: 'Biology', zh: '生物' }, icon: 'biotech', color: 're' },
  ],

  // ── QUESTIONS ─────────────────────────────────────────────
  q: {
    // Mathematics
    math: [
      {
        q: { ar: 'ما ناتج 7 × 8؟', en: 'What is 7 × 8?', zh: '7 × 8 等于多少？' },
        opts: [{ ar: '54', en: '54', zh: '54' }, { ar: '56', en: '56', zh: '56' }, { ar: '48', en: '48', zh: '48' }, { ar: '63', en: '63', zh: '63' }],
        ans: 1,
        hint: { ar: 'فكّر في 7 مجموعات كل منها 8 عناصر. أو اجمع 8 سبع مرات.', en: 'Think of 7 groups of 8 items each. Or add 8 seven times.', zh: '想象有7组，每组8个。或者把8加七次。' }
      },
      {
        q: { ar: 'ما الجذر التربيعي للعدد 144؟', en: 'What is the square root of 144?', zh: '144的平方根是多少？' },
        opts: [{ ar: '11', en: '11', zh: '11' }, { ar: '14', en: '14', zh: '14' }, { ar: '12', en: '12', zh: '12' }, { ar: '13', en: '13', zh: '13' }],
        ans: 2,
        hint: { ar: 'أي عدد مضروب في نفسه يساوي 144؟ جرّب 12.', en: 'What number multiplied by itself equals 144? Try 12.', zh: '哪个数字乘以自己等于144？试试12。' }
      },
      {
        q: { ar: 'ما ثلث العدد 90؟', en: 'What is one third of 90?', zh: '90的三分之一是多少？' },
        opts: [{ ar: '25', en: '25', zh: '25' }, { ar: '30', en: '30', zh: '30' }, { ar: '45', en: '45', zh: '45' }, { ar: '20', en: '20', zh: '20' }],
        ans: 1,
        hint: { ar: 'اقسم 90 على 3.', en: 'Divide 90 by 3.', zh: '90除以3。' }
      },
      {
        q: { ar: 'ما مجموع زوايا المثلث؟', en: 'What is the sum of the angles of a triangle?', zh: '三角形的内角和是多少？' },
        opts: [{ ar: '90°', en: '90°', zh: '90°' }, { ar: '360°', en: '360°', zh: '360°' }, { ar: '180°', en: '180°', zh: '180°' }, { ar: '270°', en: '270°', zh: '270°' }],
        ans: 2,
        hint: { ar: 'أي مثلث — كبيراً كان أم صغيراً — مجموع زواياه الداخلية ثابت.', en: 'Any triangle — big or small — has a constant sum of interior angles.', zh: '任何三角形——无论大小——其内角和是恒定的。' }
      },
      {
        q: { ar: 'ما العدد الأولي الذي يلي 17؟', en: 'What is the prime number after 17?', zh: '17后面的质数是多少？' },
        opts: [{ ar: '18', en: '18', zh: '18' }, { ar: '19', en: '19', zh: '19' }, { ar: '21', en: '21', zh: '21' }, { ar: '23', en: '23', zh: '23' }],
        ans: 1,
        hint: { ar: 'العدد الأولي لا يقبل القسمة إلا على 1 وعلى نفسه. 18 و21 يقبلان القسمة على 3.', en: 'A prime number is only divisible by 1 and itself. 18 and 21 are divisible by 3.', zh: '质数只能被1和它本身整除。18和21都能被3整除。' }
      },
      {
        q: { ar: 'ما قيمة 15 × 4؟', en: 'What is 15 × 4?', zh: '15 × 4 等于多少？' },
        opts: [{ ar: '45', en: '45', zh: '45' }, { ar: '60', en: '60', zh: '60' }, { ar: '75', en: '75', zh: '75' }, { ar: '90', en: '90', zh: '90' }],
        ans: 1,
        hint: { ar: '15 × 4 = 15 + 15 + 15 + 15. أو 10×4 + 5×4.', en: '15 × 4 = 15 + 15 + 15 + 15. Or 10×4 + 5×4.', zh: '15 × 4 = 15 + 15 + 15 + 15。或者 10×4 + 5×4。' }
      },
      {
        q: { ar: 'ما الكسر المكافئ لـ 0.75؟', en: 'What fraction is equivalent to 0.75?', zh: '哪个分数等于0.75？' },
        opts: [{ ar: '2/3', en: '2/3', zh: '2/3' }, { ar: '3/4', en: '3/4', zh: '3/4' }, { ar: '4/5', en: '4/5', zh: '4/5' }, { ar: '1/2', en: '1/2', zh: '1/2' }],
        ans: 1,
        hint: { ar: '75 من 100 = ثلاثة أرباع.', en: '75 out of 100 = three quarters.', zh: '100中的75等于四分之三。' }
      },
      {
        q: { ar: 'كم ضلعاً للمكعب؟', en: 'How many edges does a cube have?', zh: '一个立方体有多少条棱？' },
        opts: [{ ar: '6', en: '6', zh: '6' }, { ar: '8', en: '8', zh: '8' }, { ar: '12', en: '12', zh: '12' }, { ar: '10', en: '10', zh: '10' }],
        ans: 2,
        hint: { ar: 'للمكعب 6 أوجه، وكل وجه مربع له 4 أضلاع. لكن الأضلاع مشتركة.', en: 'A cube has 6 faces, each a square with 4 edges. But edges are shared.', zh: '立方体有6个面，每个面是正方形有4条边。但边是共享的。' }
      },
      {
        q: { ar: 'ما محيط دائرة نصف قطرها 7 سم؟ (π ≈ 22/7)', en: 'What is the circumference of a circle with radius 7 cm? (π ≈ 22/7)', zh: '半径为7厘米的圆的周长是多少？ (π ≈ 22/7)' },
        opts: [{ ar: '44 سم', en: '44 cm', zh: '44厘米' }, { ar: '49 سم', en: '49 cm', zh: '49厘米' }, { ar: '38 سم', en: '38 cm', zh: '38厘米' }, { ar: '22 سم', en: '22 cm', zh: '22厘米' }],
        ans: 0,
        hint: { ar: 'المحيط = 2 × π × نصف القطر. استخدم π = 22/7.', en: 'Circumference = 2 × π × radius. Use π = 22/7.', zh: '周长 = 2 × π × 半径。使用 π = 22/7。' }
      },
      {
        q: { ar: 'ما ناتج 2³؟', en: 'What is 2³?', zh: '2³ 等于多少？' },
        opts: [{ ar: '6', en: '6', zh: '6' }, { ar: '8', en: '8', zh: '8' }, { ar: '9', en: '9', zh: '9' }, { ar: '4', en: '4', zh: '4' }],
        ans: 1,
        hint: { ar: '2 × 2 × 2 = ؟', en: '2 × 2 × 2 = ?', zh: '2 × 2 × 2 = ？' }
      }
    ],

    // Science
    sci: [
      {
        q: { ar: 'ما أكبر كوكب في المجموعة الشمسية؟', en: 'What is the largest planet in the solar system?', zh: '太阳系中最大的行星是哪颗？' },
        opts: [{ ar: 'زحل', en: 'Saturn', zh: '土星' }, { ar: 'المريخ', en: 'Mars', zh: '火星' }, { ar: 'المشتري', en: 'Jupiter', zh: '木星' }, { ar: 'نبتون', en: 'Neptune', zh: '海王星' }],
        ans: 2,
        hint: { ar: 'الكوكب الخامس من الشمس، مشهور ببقعة حمراء عظيمة.', en: 'The fifth planet from the Sun, famous for its Great Red Spot.', zh: '距离太阳第五远的行星，以其大红斑而闻名。' }
      },
      {
        q: { ar: 'ما الرمز الكيميائي للذهب؟', en: 'What is the chemical symbol for gold?', zh: '金的化学符号是什么？' },
        opts: [{ ar: 'Go', en: 'Go', zh: 'Go' }, { ar: 'Gd', en: 'Gd', zh: 'Gd' }, { ar: 'Au', en: 'Au', zh: 'Au' }, { ar: 'Ag', en: 'Ag', zh: 'Ag' }],
        ans: 2,
        hint: { ar: 'مشتق من الكلمة اللاتينية "aurum". Ag هو الفضة.', en: 'Derived from the Latin word "aurum". Ag is silver.', zh: '源自拉丁语 "aurum"。Ag 是银。' }
      },
      {
        q: { ar: 'كم عدد عظام جسم الإنسان البالغ؟', en: 'How many bones are in the adult human body?', zh: '成年人体内有多少块骨头？' },
        opts: [{ ar: '206', en: '206', zh: '206' }, { ar: '186', en: '186', zh: '186' }, { ar: '256', en: '256', zh: '256' }, { ar: '300', en: '300', zh: '300' }],
        ans: 0,
        hint: { ar: 'يشمل جميع عظام اليدين والقدمين الصغيرة. حوالي 206.', en: 'Includes all the small bones in the hands and feet. Around 206.', zh: '包括手和脚上所有的小骨头。大约206块。' }
      },
      {
        q: { ar: 'ما وحدة قياس المقاومة الكهربائية؟', en: 'What is the unit of electrical resistance?', zh: '电阻的单位是什么？' },
        opts: [{ ar: 'فولت', en: 'Volt', zh: '伏特' }, { ar: 'واط', en: 'Watt', zh: '瓦特' }, { ar: 'أوم', en: 'Ohm', zh: '欧姆' }, { ar: 'أمبير', en: 'Ampere', zh: '安培' }],
        ans: 2,
        hint: { ar: 'سُميت نسبة للعالم Georg Simon Ohm.', en: 'Named after the scientist Georg Simon Ohm.', zh: '以科学家乔治·西蒙·欧姆的名字命名。' }
      },
      {
        q: { ar: 'ما الغاز الذي تمتصه النباتات في عملية التمثيل الضوئي؟', en: 'What gas do plants absorb during photosynthesis?', zh: '植物在光合作用中吸收什么气体？' },
        opts: [{ ar: 'الأكسجين', en: 'Oxygen', zh: '氧气' }, { ar: 'الهيدروجين', en: 'Hydrogen', zh: '氢气' }, { ar: 'ثاني أكسيد الكربون', en: 'Carbon dioxide', zh: '二氧化碳' }, { ar: 'النيتروجين', en: 'Nitrogen', zh: '氮气' }],
        ans: 2,
        hint: { ar: 'نحن نزفره والنباتات تحتاجه لصنع غذائها.', en: 'We exhale it, and plants need it to make their food.', zh: '我们呼出它，植物需要它来制造食物。' }
      },
      {
        q: { ar: 'ما سرعة الضوء التقريبية في الفراغ؟', en: 'What is the approximate speed of light in a vacuum?', zh: '光在真空中的近似速度是多少？' },
        opts: [{ ar: '300,000 كم/ث', en: '300,000 km/s', zh: '300,000公里/秒' }, { ar: '150,000 كم/ث', en: '150,000 km/s', zh: '150,000公里/秒' }, { ar: '500,000 كم/ث', en: '500,000 km/s', zh: '500,000公里/秒' }, { ar: '100,000 كم/ث', en: '100,000 km/s', zh: '100,000公里/秒' }],
        ans: 0,
        hint: { ar: 'حوالي 300 ألف كيلومتر في الثانية.', en: 'About 300 thousand kilometers per second.', zh: '大约每秒30万公里。' }
      },
      {
        q: { ar: 'ما العنصر الأكثر وفرة في الغلاف الجوي للأرض؟', en: 'What is the most abundant element in Earth\'s atmosphere?', zh: '地球大气中含量最多的元素是什么？' },
        opts: [{ ar: 'الأكسجين', en: 'Oxygen', zh: '氧气' }, { ar: 'الهيدروجين', en: 'Hydrogen', zh: '氢气' }, { ar: 'النيتروجين', en: 'Nitrogen', zh: '氮气' }, { ar: 'ثاني أكسيد الكربون', en: 'Carbon dioxide', zh: '二氧化碳' }],
        ans: 2,
        hint: { ar: 'يشكّل حوالي 78% من الهواء الذي نتنفسه.', en: 'It makes up about 78% of the air we breathe.', zh: '它约占我们呼吸空气的78%。' }
      },
      {
        q: { ar: 'كم عدد أسنان الإنسان البالغ الكاملة؟', en: 'How many teeth does a full-grown adult human have?', zh: '成年人的完整牙齿有多少颗？' },
        opts: [{ ar: '28', en: '28', zh: '28' }, { ar: '32', en: '32', zh: '32' }, { ar: '36', en: '36', zh: '36' }, { ar: '30', en: '30', zh: '30' }],
        ans: 1,
        hint: { ar: 'تشمل 4 ضروس عقل.', en: 'Includes 4 wisdom teeth.', zh: '包括4颗智齿。' }
      },
      {
        q: { ar: 'ما أقرب كوكب إلى الشمس؟', en: 'What is the closest planet to the Sun?', zh: '离太阳最近的行星是哪颗？' },
        opts: [{ ar: 'الزهرة', en: 'Venus', zh: '金星' }, { ar: 'الأرض', en: 'Earth', zh: '地球' }, { ar: 'عطارد', en: 'Mercury', zh: '水星' }, { ar: 'المريخ', en: 'Mars', zh: '火星' }],
        ans: 2,
        hint: { ar: 'أصغر كواكب المجموعة الشمسية وأسرعها.', en: 'The smallest and fastest planet in the solar system.', zh: '太阳系中最小、最快的行星。' }
      },
      {
        q: { ar: 'ما القانون الفيزيائي: القوة = ؟', en: 'What is the physics formula: Force = ?', zh: '哪个物理公式：力 = ？' },
        opts: [{ ar: 'الكتلة × السرعة', en: 'mass × velocity', zh: '质量 × 速度' }, { ar: 'الكتلة × التسارع', en: 'mass × acceleration', zh: '质量 × 加速度' }, { ar: 'الوزن × المسافة', en: 'weight × distance', zh: '重量 × 距离' }, { ar: 'الطاقة × الزمن', en: 'energy × time', zh: '能量 × 时间' }],
        ans: 1,
        hint: { ar: 'قانون نيوتن الثاني. F = m × a.', en: 'Newton\'s second law. F = m × a.', zh: '牛顿第二定律。F = m × a。' }
      }
    ],

    // History
    hist: [
      {
        q: { ar: 'في أي عام سقط جدار برلين؟', en: 'In which year did the Berlin Wall fall?', zh: '柏林墙在哪一年倒塌？' },
        opts: [{ ar: '1987', en: '1987', zh: '1987' }, { ar: '1989', en: '1989', zh: '1989' }, { ar: '1991', en: '1991', zh: '1991' }, { ar: '1993', en: '1993', zh: '1993' }],
        ans: 1,
        hint: { ar: 'أواخر الثمانينيات، إيذاناً بنهاية الحرب الباردة.', en: 'Late 1980s, marking the end of the Cold War.', zh: '80年代末，标志着冷战的结束。' }
      },
      {
        q: { ar: 'من كتب الإلياذة والأوديسة؟', en: 'Who wrote the Iliad and the Odyssey?', zh: '谁写了《伊利亚特》和《奥德赛》？' },
        opts: [{ ar: 'سقراط', en: 'Socrates', zh: '苏格拉底' }, { ar: 'أفلاطون', en: 'Plato', zh: '柏拉图' }, { ar: 'هوميروس', en: 'Homer', zh: '荷马' }, { ar: 'فيرجيل', en: 'Virgil', zh: '维吉尔' }],
        ans: 2,
        hint: { ar: 'شاعر يوناني قديم يُقال إنه كان أعمى. من أشهر شعراء الملاحم.', en: 'An ancient Greek poet, said to have been blind. One of the most famous epic poets.', zh: '一位据说失明的古希腊诗人。最著名的史诗诗人之一。' }
      },
      {
        q: { ar: 'أول دولة منحت المرأة حق التصويت؟', en: 'Which was the first country to grant women the right to vote?', zh: '哪个国家是第一个给予女性投票权的？' },
        opts: [{ ar: 'أمريكا', en: 'USA', zh: '美国' }, { ar: 'بريطانيا', en: 'Britain', zh: '英国' }, { ar: 'نيوزيلندا', en: 'New Zealand', zh: '新西兰' }, { ar: 'فرنسا', en: 'France', zh: '法国' }],
        ans: 2,
        hint: { ar: 'دولة جزيرة في المحيط الهادئ، عام 1893.', en: 'An island nation in the Pacific Ocean, in 1893.', zh: '太平洋上的一个岛国，1893年。' }
      },
      {
        q: { ar: 'أي إمبراطورية بنت الكولوسيوم؟', en: 'Which empire built the Colosseum?', zh: '哪个帝国建造了罗马斗兽场？' },
        opts: [{ ar: 'اليونانية', en: 'Greek', zh: '希腊' }, { ar: 'العثمانية', en: 'Ottoman', zh: '奥斯曼' }, { ar: 'الرومانية', en: 'Roman', zh: '罗马' }, { ar: 'البيزنطية', en: 'Byzantine', zh: '拜占庭' }],
        ans: 2,
        hint: { ar: 'بُني حوالي 70–80 م في قلب روما.', en: 'Built around 70–80 AD in the heart of Rome.', zh: '建于公元70-80年左右，位于罗马市中心。' }
      },
      {
        q: { ar: 'في أي عام انتهت الحرب العالمية الثانية؟', en: 'In which year did World War II end?', zh: '第二次世界大战在哪一年结束？' },
        opts: [{ ar: '1943', en: '1943', zh: '1943' }, { ar: '1944', en: '1944', zh: '1944' }, { ar: '1945', en: '1945', zh: '1945' }, { ar: '1946', en: '1946', zh: '1946' }],
        ans: 2,
        hint: { ar: 'استسلمت ألمانيا في مايو، واليابان في سبتمبر من هذا العام.', en: 'Germany surrendered in May, and Japan in September of this year.', zh: '德国于5月投降，日本于同年9月投降。' }
      },
      {
        q: { ar: 'من هو موحد المملكة العربية السعودية؟', en: 'Who unified the Kingdom of Saudi Arabia?', zh: '谁统一了沙特阿拉伯王国？' },
        opts: [{ ar: 'الملك سعود', en: 'King Saud', zh: '沙特国王' }, { ar: 'الملك عبدالعزيز', en: 'King Abdulaziz', zh: '阿卜杜勒阿齐兹国王' }, { ar: 'الملك فيصل', en: 'King Faisal', zh: '费萨尔国王' }, { ar: 'الملك خالد', en: 'King Khalid', zh: '哈立德国王' }],
        ans: 1,
        hint: { ar: 'وُحدت المملكة عام 1932 على يد هذا الملك.', en: 'The kingdom was unified in 1932 by this king.', zh: '王国于1932年由这位国王统一。' }
      },
      {
        q: { ar: 'ما الحضارة التي بنت الأهرامات؟', en: 'Which civilization built the pyramids?', zh: '哪个文明建造了金字塔？' },
        opts: [{ ar: 'الرومانية', en: 'Roman', zh: '罗马' }, { ar: 'الفرعونية', en: 'Egyptian (Pharaonic)', zh: '古埃及（法老）' }, { ar: 'الإغريقية', en: 'Greek', zh: '希腊' }, { ar: 'الفارسية', en: 'Persian', zh: '波斯' }],
        ans: 1,
        hint: { ar: 'حضارة قامت على ضفاف النيل في مصر القديمة.', en: 'A civilization that flourished on the banks of the Nile in ancient Egypt.', zh: '一个在古埃及尼罗河畔繁荣起来的文明。' }
      },
      {
        q: { ar: 'في أي عام هاجر النبي محمد ﷺ إلى المدينة؟', en: 'In which year did Prophet Muhammad (PBUH) migrate to Medina?', zh: '先知穆罕默德（愿主福安之）在哪一年迁徙到麦地那？' },
        opts: [{ ar: '610 م', en: '610 CE', zh: '公元610年' }, { ar: '622 م', en: '622 CE', zh: '公元622年' }, { ar: '632 م', en: '632 CE', zh: '公元632年' }, { ar: '615 م', en: '615 CE', zh: '公元615年' }],
        ans: 1,
        hint: { ar: 'بداية التقويم الهجري.', en: 'The beginning of the Hijri calendar.', zh: '伊斯兰教历（希吉拉历）的开端。' }
      },
      {
        q: { ar: 'من اكتشف أمريكا عام 1492؟', en: 'Who discovered the Americas in 1492?', zh: '谁在1492年发现了美洲？' },
        opts: [{ ar: 'فاسكو دي غاما', en: 'Vasco da Gama', zh: '瓦斯科·达伽马' }, { ar: 'ماجلان', en: 'Magellan', zh: '麦哲伦' }, { ar: 'كريستوفر كولومبوس', en: 'Christopher Columbus', zh: '克里斯托弗·哥伦布' }, { ar: 'أمريكو فسبوتشي', en: 'Amerigo Vespucci', zh: '阿美利哥·韦斯普奇' }],
        ans: 2,
        hint: { ar: 'مستكشف إيطالي أبحر برعاية إسبانية.', en: 'An Italian explorer who sailed under Spanish patronage.', zh: '一位在西班牙资助下航行的意大利探险家。' }
      },
      {
        q: { ar: 'ما أول جامعة في العالم؟', en: 'What is the oldest university in the world?', zh: '世界上最古老的大学是哪所？' },
        opts: [{ ar: 'الأزهر', en: 'Al-Azhar', zh: '爱资哈尔大学' }, { ar: 'القرويين', en: 'Al-Qarawiyyin', zh: '卡鲁因大学' }, { ar: 'السوربون', en: 'Sorbonne', zh: '索邦大学' }, { ar: 'بولونيا', en: 'Bologna', zh: '博洛尼亚大学' }],
        ans: 1,
        hint: { ar: 'تأسست عام 859 م في فاس، المغرب على يد فاطمة الفهرية.', en: 'Founded in 859 CE in Fez, Morocco by Fatima al-Fihri.', zh: '由法蒂玛·菲赫里于公元859年在摩洛哥非斯创立。' }
      }
    ],

    // Geography
    geo: [
      {
        q: { ar: 'ما أطول نهر في العالم؟', en: 'What is the longest river in the world?', zh: '世界上最长的河流是哪条？' },
        opts: [{ ar: 'الأمازون', en: 'Amazon', zh: '亚马逊河' }, { ar: 'النيل', en: 'Nile', zh: '尼罗河' }, { ar: 'المسيسيبي', en: 'Mississippi', zh: '密西西比河' }, { ar: 'الكونغو', en: 'Congo', zh: '刚果河' }],
        ans: 1,
        hint: { ar: 'يتدفق شمالاً عبر أفريقيا إلى البحر المتوسط. طوله حوالي 6,650 كم.', en: 'Flows north through Africa into the Mediterranean Sea. Its length is about 6,650 km.', zh: '向北流经非洲，注入地中海。长度约为6,650公里。' }
      },
      {
        q: { ar: 'ما عاصمة أستراليا؟', en: 'What is the capital of Australia?', zh: '澳大利亚的首都是哪里？' },
        opts: [{ ar: 'سيدني', en: 'Sydney', zh: '悉尼' }, { ar: 'ملبورن', en: 'Melbourne', zh: '墨尔本' }, { ar: 'كانبيرا', en: 'Canberra', zh: '堪培拉' }, { ar: 'بيرث', en: 'Perth', zh: '珀斯' }],
        ans: 2,
        hint: { ar: 'بُنيت خصيصاً كحل وسط بين سيدني وملبورن.', en: 'Built specifically as a compromise between Sydney and Melbourne.', zh: '专门作为悉尼和墨尔本之间的折中方案而建。' }
      },
      {
        q: { ar: 'ما أعلى قمة جبلية على وجه الأرض؟', en: 'What is the highest mountain peak on Earth?', zh: '地球上最高的山峰是哪座？' },
        opts: [{ ar: 'كي2', en: 'K2', zh: '乔戈里峰' }, { ar: 'كانشنجانغا', en: 'Kanchenjunga', zh: '干城章嘉峰' }, { ar: 'إيفرست', en: 'Everest', zh: '珠穆朗玛峰' }, { ar: 'لوتسه', en: 'Lhotse', zh: '洛子峰' }],
        ans: 2,
        hint: { ar: 'ترتفع 8,848 متراً على حدود نيبال والصين.', en: 'Rises 8,848 meters on the border of Nepal and China.', zh: '位于尼泊尔和中国边境，海拔8,848米。' }
      },
      {
        q: { ar: 'كم عدد قارات العالم؟', en: 'How many continents are there in the world?', zh: '世界上有多少个大洲？' },
        opts: [{ ar: '5', en: '5', zh: '5' }, { ar: '6', en: '6', zh: '6' }, { ar: '7', en: '7', zh: '7' }, { ar: '8', en: '8', zh: '8' }],
        ans: 2,
        hint: { ar: 'آسيا، أفريقيا، أوروبا، أمريكا الشمالية، أمريكا الجنوبية، أستراليا، القارة القطبية الجنوبية.', en: 'Asia, Africa, Europe, North America, South America, Australia, Antarctica.', zh: '亚洲、非洲、欧洲、北美洲、南美洲、大洋洲、南极洲。' }
      },
      {
        q: { ar: 'ما أكبر محيطات العالم مساحةً؟', en: 'What is the largest ocean in the world by area?', zh: '世界上面积最大的海洋是哪个？' },
        opts: [{ ar: 'الأطلسي', en: 'Atlantic', zh: '大西洋' }, { ar: 'الهندي', en: 'Indian', zh: '印度洋' }, { ar: 'المتجمد الشمالي', en: 'Arctic', zh: '北冰洋' }, { ar: 'الهادئ', en: 'Pacific', zh: '太平洋' }],
        ans: 3,
        hint: { ar: 'يغطي قرابة نصف مساحة محيطات العالم.', en: 'It covers nearly half of the world\'s ocean area.', zh: '它覆盖了近一半的世界海洋面积。' }
      },
      {
        q: { ar: 'ما أكبر دولة عربية مساحةً؟', en: 'What is the largest Arab country by area?', zh: '面积最大的阿拉伯国家是哪个？' },
        opts: [{ ar: 'السعودية', en: 'Saudi Arabia', zh: '沙特阿拉伯' }, { ar: 'السودان', en: 'Sudan', zh: '苏丹' }, { ar: 'الجزائر', en: 'Algeria', zh: '阿尔及利亚' }, { ar: 'مصر', en: 'Egypt', zh: '埃及' }],
        ans: 2,
        hint: { ar: 'تقع في شمال أفريقيا ومساحتها حوالي 2.38 مليون كم².', en: 'Located in North Africa with an area of about 2.38 million km².', zh: '位于北非，面积约238万平方公里。' }
      },
      {
        q: { ar: 'أين يقع البحر الميت؟', en: 'Where is the Dead Sea located?', zh: '死海位于哪里？' },
        opts: [{ ar: 'بين مصر والسعودية', en: 'Between Egypt and Saudi Arabia', zh: '埃及和沙特阿拉伯之间' }, { ar: 'بين الأردن وفلسطين', en: 'Between Jordan and Palestine', zh: '约旦和巴勒斯坦之间' }, { ar: 'بين العراق وإيران', en: 'Between Iraq and Iran', zh: '伊拉克和伊朗之间' }, { ar: 'بين لبنان وسوريا', en: 'Between Lebanon and Syria', zh: '黎巴嫩和叙利亚之间' }],
        ans: 1,
        hint: { ar: 'أخفض نقطة على سطح الأرض.', en: 'The lowest point on the Earth\'s surface.', zh: '地球表面的最低点。' }
      },
      {
        q: { ar: 'ما عاصمة اليابان؟', en: 'What is the capital of Japan?', zh: '日本的首都是哪里？' },
        opts: [{ ar: 'سيول', en: 'Seoul', zh: '首尔' }, { ar: 'طوكيو', en: 'Tokyo', zh: '东京' }, { ar: 'بكين', en: 'Beijing', zh: '北京' }, { ar: 'هونغ كونغ', en: 'Hong Kong', zh: '香港' }],
        ans: 1,
        hint: { ar: 'أكبر مدينة في العالم من حيث عدد السكان.', en: 'The largest city in the world by population.', zh: '世界上人口最多的城市。' }
      },
      {
        q: { ar: 'كم عدد الدول العربية؟', en: 'How many Arab countries are there?', zh: '有多少个阿拉伯国家？' },
        opts: [{ ar: '18', en: '18', zh: '18' }, { ar: '20', en: '20', zh: '20' }, { ar: '22', en: '22', zh: '22' }, { ar: '24', en: '24', zh: '24' }],
        ans: 2,
        hint: { ar: 'من المحيط الأطلسي غرباً إلى الخليج العربي شرقاً.', en: 'From the Atlantic Ocean in the west to the Arabian Gulf in the east.', zh: '从西边的大西洋到东边的阿拉伯湾。' }
      },
      {
        q: { ar: 'ما المضيق الذي يفصل بين أوروبا وأفريقيا؟', en: 'What strait separates Europe and Africa?', zh: '哪个海峡分隔了欧洲和非洲？' },
        opts: [{ ar: 'مضيق هرمز', en: 'Strait of Hormuz', zh: '霍尔木兹海峡' }, { ar: 'مضيق جبل طارق', en: 'Strait of Gibraltar', zh: '直布罗陀海峡' }, { ar: 'مضيق البوسفور', en: 'Bosphorus Strait', zh: '博斯普鲁斯海峡' }, { ar: 'مضيق باب المندب', en: 'Bab-el-Mandeb', zh: '曼德海峡' }],
        ans: 1,
        hint: { ar: 'يقع بين إسبانيا والمغرب.', en: 'Located between Spain and Morocco.', zh: '位于西班牙和摩洛哥之间。' }
      }
    ],

    // Literature
    lit: [
      {
        q: { ar: 'من ألّف كتاب "كليلة ودمنة"؟', en: 'Who authored the book "Kalila wa Dimna"?', zh: '谁写了《卡里来和笛木乃》这本书？' },
        opts: [{ ar: 'ابن المقفع', en: 'Ibn al-Muqaffa', zh: '伊本·穆卡法' }, { ar: 'الجاحظ', en: 'Al-Jahiz', zh: '贾希兹' }, { ar: 'ابن رشد', en: 'Ibn Rushd', zh: '伊本·鲁世德' }, { ar: 'المتنبي', en: 'Al-Mutanabbi', zh: '穆太奈比' }],
        ans: 0,
        hint: { ar: 'أديب عباسي مشهور بترجمته عن الفارسية. اسمه عبد الله بن المقفع.', en: 'A famous Abbasid writer known for his translation from Persian. His name is Abdullah ibn al-Muqaffa.', zh: '一位以翻译波斯语闻名的阿拔斯王朝作家。名叫阿卜杜拉·伊本·穆卡法。' }
      },
      {
        q: { ar: 'ما معنى كلمة "الفصاحة"؟', en: 'What is the meaning of the word "Eloquence" (Al-Fasahah)?', zh: '"修辞" (Al-Fasahah) 一词的含义是什么？' },
        opts: [{ ar: 'الكذب', en: 'Lying', zh: '说谎' }, { ar: 'وضوح التعبير وسلامة اللغة', en: 'Clarity of expression and linguistic correctness', zh: '表达清晰且语言正确' }, { ar: 'قصر الجملة', en: 'Brevity', zh: '简洁' }, { ar: 'كثرة الكلام', en: 'Verbosity', zh: '冗长' }],
        ans: 1,
        hint: { ar: 'صفة تُمدح بها اللغة والخطيب. عكس العي والركاكة.', en: 'A quality praised in language and oratory. Opposite of defect and weakness.', zh: '语言和演讲中受称赞的品质。与缺陷和薄弱相反。' }
      },
      {
        q: { ar: 'ما أشهر مؤلفات الجاحظ؟', en: 'What is Al-Jahiz\'s most famous work?', zh: '贾希兹最著名的作品是什么？' },
        opts: [{ ar: 'المقامات', en: 'Al-Maqamat', zh: '麦卡玛特' }, { ar: 'البخلاء', en: 'Al-Bukhala (The Book of Misers)', zh: '吝啬鬼》' }, { ar: 'الأغاني', en: 'Al-Aghani', zh: '诗歌集' }, { ar: 'ديوان الحماسة', en: 'Diwan al-Hamasa', zh: '豪情诗集' }],
        ans: 1,
        hint: { ar: 'كتاب ساخر يرصد ظاهرة اجتماعية في العصر العباسي.', en: 'A satirical book that observes a social phenomenon in the Abbasid era.', zh: '一本讽刺书，观察了阿拔斯王朝时期的一种社会现象。' }
      },
      {
        q: { ar: 'ما لقب الشاعر أحمد شوقي؟', en: 'What is the title of the poet Ahmed Shawqi?', zh: '诗人艾哈迈德·邵基的称号是什么？' },
        opts: [{ ar: 'أمير الشعراء', en: 'Prince of Poets', zh: '诗王' }, { ar: 'نبي الشعراء', en: 'Prophet of Poets', zh: '诗圣' }, { ar: 'ملك الشعراء', en: 'King of Poets', zh: '诗皇' }, { ar: 'شاعر النيل', en: 'Poet of the Nile', zh: '尼罗河诗人' }],
        ans: 0,
        hint: { ar: 'لُقب بهذا اللقب في حفل تكريم أقيم في دار الأوبرا المصرية.', en: 'He was given this title at a tribute ceremony held at the Cairo Opera House.', zh: '在开罗歌剧院举行的致敬仪式上被授予此称号。' }
      },
      {
        q: { ar: 'ما البحر الشعري لقصيدة "أنا البحر في أحشائه الدر كامن"؟', en: 'What is the meter (Bahr) of the poem "Ana Al-Bahr fi Ahsha ihi Al-Durru Kamin"?', zh: '诗歌 "我是大海，腹中藏珠" 的格律（海洋）是什么？' },
        opts: [{ ar: 'الطويل', en: 'At-Tawil', zh: '长律' }, { ar: 'الكامل', en: 'Al-Kamil', zh: '全律' }, { ar: 'البسيط', en: 'Al-Basit', zh: '简律' }, { ar: 'الوافر', en: 'Al-Wafir', zh: '足律' }],
        ans: 1,
        hint: { ar: 'بحر يتميز بالكمال والاتزان. تفعيلته: مُتَفَاعِلُنْ.', en: 'A meter characterized by perfection and balance. Its foot: Mutafa\'ilun.', zh: '一种以完美和平衡为特征的格律。其音步：穆塔法伊伦。' }
      },
      {
        q: { ar: 'من مؤلف "ألف ليلة وليلة"؟', en: 'Who is the author of "One Thousand and One Nights"?', zh: '《一千零一夜》的作者是谁？' },
        opts: [{ ar: 'مؤلف مجهول', en: 'Unknown author', zh: '佚名作者' }, { ar: 'ابن المقفع', en: 'Ibn al-Muqaffa', zh: '伊本·穆卡法' }, { ar: 'الجاحظ', en: 'Al-Jahiz', zh: '贾希兹' }, { ar: 'التوحيدي', en: 'Al-Tawhidi', zh: '陶希迪' }],
        ans: 0,
        hint: { ar: 'مجموعة قصصية تراثية جُمعت عبر قرون. مؤلفها الأصلي غير معروف.', en: 'A traditional story collection compiled over centuries. Its original author is unknown.', zh: '一部历经数个世纪编纂而成的传统故事集。其原作者不详。' }
      },
      {
        q: { ar: 'من هو شاعر الرسول ﷺ؟', en: 'Who was the poet of Prophet Muhammad (PBUH)?', zh: '谁是真主使者（愿主福安之）的诗人？' },
        opts: [{ ar: 'حسان بن ثابت', en: 'Hassan ibn Thabit', zh: '哈桑·伊本·萨比特' }, { ar: 'كعب بن زهير', en: 'Ka b ibn Zuhayr', zh: '卡阿卜·伊本·祖海尔' }, { ar: 'الخنساء', en: 'Al-Khansa', zh: '汉莎' }, { ar: 'عنترة بن شداد', en: 'Antarah ibn Shaddad', zh: '安塔拉·伊本·沙达德' }],
        ans: 0,
        hint: { ar: 'شاعر مخضرم عاش في الجاهلية والإسلام.', en: 'A Mu\'khadram poet who lived during both the pre-Islamic and Islamic periods.', zh: '一位生活在伊斯兰教前和伊斯兰教时期的诗人（穆赫达拉姆）。' }
      },
      {
        q: { ar: 'ما اسم ناقة الشاعر العربي القديم التي يصفها في معلقته؟', en: 'What is the name of the ancient Arab poet\'s she-camel that he describes in his Mu\'allaqa?', zh: '古代阿拉伯诗人在其悬诗中描述的那只母骆驼叫什么名字？' },
        opts: [{ ar: 'الجراء', en: 'Al-Jarra', zh: '贾拉' }, { ar: 'الوجناء', en: 'Al-Wajna', zh: '瓦吉纳' }, { ar: 'الناقة لا تُسمى', en: 'The she-camel is usually unnamed', zh: '母骆驼通常没有名字' }, { ar: 'اليعملة', en: 'Al-Ya\'malah', zh: '亚马拉' }],
        ans: 2,
        hint: { ar: 'الشعراء يصفون نوقهم غالباً دون تسميتها.', en: 'Poets often describe their she-camels without naming them.', zh: '诗人们常常描述他们的母骆驼，但通常不给它们命名。' }
      },
      {
        q: { ar: 'من أشهر شعراء العصر الأموي في شعر الغزل؟', en: 'Who is among the most famous poets of the Umayyad era for love poetry (Ghazal)?', zh: '谁是倭马亚王朝时期最著名的情诗诗人之一？' },
        opts: [{ ar: 'جميل بثينة', en: 'Jamil ibn Ma\'mar (Jamil Buthayna)', zh: '贾米尔·伊本·马马尔（贾米尔·布塞纳）' }, { ar: 'أبو نواس', en: 'Abu Nuwas', zh: '阿布·努瓦斯' }, { ar: 'البحتري', en: 'Al-Buhturi', zh: '布赫图里' }, { ar: 'أبو العلاء المعري', en: 'Abu al-Ala al-Ma\'arri', zh: '阿布·阿拉·马阿里' }],
        ans: 0,
        hint: { ar: 'عُرف بحبه العذري لبثينة.', en: 'Known for his platonic (Udhri) love for Buthayna.', zh: '以他对布塞纳的柏拉图式（乌德里）爱情而闻名。' }
      },
      {
        q: { ar: 'كم عدد بحور الشعر العربي؟', en: 'How many meters (Buhur) are there in Arabic poetry?', zh: '阿拉伯诗歌中有多少种格律（巴赫尔）？' },
        opts: [{ ar: '12', en: '12', zh: '12' }, { ar: '14', en: '14', zh: '14' }, { ar: '16', en: '16', zh: '16' }, { ar: '10', en: '10', zh: '10' }],
        ans: 2,
        hint: { ar: 'وضعها الخليل بن أحمد الفراهيدي.', en: 'They were defined by Al-Khalil ibn Ahmad al-Farahidi.', zh: '由哈利勒·伊本·艾哈迈德·法拉希迪定义。' }
      }
    ],

    // Biology
    bio: [
      {
        q: { ar: 'ما "محطة الطاقة" في الخلية؟', en: 'What is the "powerhouse" of the cell?', zh: '细胞的 "能量工厂" 是什么？' },
        opts: [{ ar: 'النواة', en: 'Nucleus', zh: '细胞核' }, { ar: 'الريبوسوم', en: 'Ribosome', zh: '核糖体' }, { ar: 'الميتوكوندريا', en: 'Mitochondria', zh: '线粒体' }, { ar: 'الفجوة العصارية', en: 'Vacuole', zh: '液泡' }],
        ans: 2,
        hint: { ar: 'تُنتج جزيئات ATP عبر عملية التنفس الخلوي.', en: 'It produces ATP molecules through cellular respiration.', zh: '它通过细胞呼吸产生ATP分子。' }
      },
      {
        q: { ar: 'كم عدد الكروموسومات في خلايا الإنسان؟', en: 'How many chromosomes are in human cells?', zh: '人类细胞中有多少条染色体？' },
        opts: [{ ar: '23', en: '23', zh: '23' }, { ar: '44', en: '44', zh: '44' }, { ar: '46', en: '46', zh: '46' }, { ar: '48', en: '48', zh: '48' }],
        ans: 2,
        hint: { ar: '23 زوجاً = 46 كروموسوماً في كل خلية جسمية.', en: '23 pairs = 46 chromosomes in each somatic cell.', zh: '23对 = 每个体细胞中有46条染色体。' }
      },
      {
        q: { ar: 'ما فصيلة الدم المانحة العالمية؟', en: 'What is the universal donor blood type?', zh: '哪种血型是万能供血者？' },
        opts: [{ ar: 'A+', en: 'A+', zh: 'A+' }, { ar: 'O−', en: 'O−', zh: 'O−' }, { ar: 'AB+', en: 'AB+', zh: 'AB+' }, { ar: 'B−', en: 'B−', zh: 'B−' }],
        ans: 1,
        hint: { ar: 'لا تحتوي على مستضدات A أو B أو عامل Rh.', en: 'It lacks A, B, or Rh antigens.', zh: '它缺乏A、B或Rh抗原。' }
      },
      {
        q: { ar: 'ما العملية التي تُنتج الأمشاج؟', en: 'What process produces gametes?', zh: '哪种过程产生配子？' },
        opts: [{ ar: 'الانقسام المتساوي', en: 'Mitosis', zh: '有丝分裂' }, { ar: 'التناضح', en: 'Osmosis', zh: '渗透作用' }, { ar: 'الانقسام الاختزالي', en: 'Meiosis', zh: '减数分裂' }, { ar: 'الانشطار الثنائي', en: 'Binary fission', zh: '二分裂' }],
        ans: 2,
        hint: { ar: 'تُنتج 4 خلايا أحادية الصيغة الصبغية (نصف عدد الكروموسومات).', en: 'Produces 4 haploid cells (half the number of chromosomes).', zh: '产生4个单倍体细胞（染色体数目减半）。' }
      },
      {
        q: { ar: 'ما الجزيء الحامل للمعلومات الوراثية؟', en: 'What molecule carries genetic information?', zh: '哪种分子携带遗传信息？' },
        opts: [{ ar: 'RNA', en: 'RNA', zh: 'RNA' }, { ar: 'ATP', en: 'ATP', zh: 'ATP' }, { ar: 'DNA', en: 'DNA', zh: 'DNA' }, { ar: 'البروتين', en: 'Protein', zh: '蛋白质' }],
        ans: 2,
        hint: { ar: 'اكتُشف تركيبه المزدوج (الحلزون المزدوج) عام 1953.', en: 'Its double-helix structure was discovered in 1953.', zh: '其双螺旋结构于1953年被发现。' }
      },
      {
        q: { ar: 'كم غرفة في قلب الإنسان؟', en: 'How many chambers does the human heart have?', zh: '人类心脏有几个腔室？' },
        opts: [{ ar: '2', en: '2', zh: '2' }, { ar: '3', en: '3', zh: '3' }, { ar: '4', en: '4', zh: '4' }, { ar: '6', en: '6', zh: '6' }],
        ans: 2,
        hint: { ar: 'أذينان وبُطينان.', en: 'Two atria and two ventricles.', zh: '两个心房和两个心室。' }
      },
      {
        q: { ar: 'ما الفيتامين الذي يُصنع في الجلد عند التعرض للشمس؟', en: 'Which vitamin is produced in the skin upon exposure to sunlight?', zh: '皮肤暴露在阳光下会产生哪种维生素？' },
        opts: [{ ar: 'A', en: 'A', zh: 'A' }, { ar: 'B12', en: 'B12', zh: 'B12' }, { ar: 'C', en: 'C', zh: 'C' }, { ar: 'D', en: 'D', zh: 'D' }],
        ans: 3,
        hint: { ar: 'فيتامين الشمس. مهم لامتصاص الكالسيوم.', en: 'The sunshine vitamin. Important for calcium absorption.', zh: '阳光维生素。对钙的吸收很重要。' }
      },
      {
        q: { ar: 'ما أكبر عضو في جسم الإنسان؟', en: 'What is the largest organ in the human body?', zh: '人体最大的器官是什么？' },
        opts: [{ ar: 'الكبد', en: 'Liver', zh: '肝脏' }, { ar: 'الدماغ', en: 'Brain', zh: '大脑' }, { ar: 'الجلد', en: 'Skin', zh: '皮肤' }, { ar: 'الرئتان', en: 'Lungs', zh: '肺' }],
        ans: 2,
        hint: { ar: 'يغطي كامل الجسم ويعمل كحاجز واقٍ.', en: 'It covers the entire body and acts as a protective barrier.', zh: '它覆盖全身，起到保护屏障的作用。' }
      },
      {
        q: { ar: 'ما عدد أضلاع القفص الصدري للإنسان؟', en: 'How many ribs does the human rib cage have?', zh: '人体的肋骨笼有多少根肋骨？' },
        opts: [{ ar: '10 أزواج', en: '10 pairs', zh: '10对' }, { ar: '12 زوجاً', en: '12 pairs', zh: '12对' }, { ar: '14 زوجاً', en: '14 pairs', zh: '14对' }, { ar: '8 أزواج', en: '8 pairs', zh: '8对' }],
        ans: 1,
        hint: { ar: '24 ضلعاً = 12 زوجاً.', en: '24 ribs = 12 pairs.', zh: '24根肋骨 = 12对。' }
      },
      {
        q: { ar: 'أي جزء من الخلية النباتية مسؤول عن التمثيل الضوئي؟', en: 'Which part of the plant cell is responsible for photosynthesis?', zh: '植物细胞的哪个部分负责光合作用？' },
        opts: [{ ar: 'الميتوكوندريا', en: 'Mitochondria', zh: '线粒体' }, { ar: 'النواة', en: 'Nucleus', zh: '细胞核' }, { ar: 'البلاستيدات الخضراء', en: 'Chloroplasts', zh: '叶绿体' }, { ar: 'الفجوة', en: 'Vacuole', zh: '液泡' }],
        ans: 2,
        hint: { ar: 'تحتوي على الكلوروفيل (اليخضور).', en: 'It contains chlorophyll.', zh: '它含有叶绿素。' }
      }
    ]
  },

  // ── LESSONS ───────────────────────────────────────────────
  lessons: {
    math: [
      {
        title: { ar: 'أساسيات الضرب', en: 'Basics of Multiplication', zh: '乘法基础' },
        body: { ar: 'الضرب هو <span class="lhl">جمع متكرر</span>. مثلاً 7 × 8 تعني جمع 7 ثماني مرات: 7+7+7+7+7+7+7+7 = 56.<br><br>حفظ جداول الضرب من 1 إلى 12 من أهم مهارات الرياضيات. نمط مفيد: أي عدد مضروب في 9 يكون مجموع أرقام الناتج 9 (مثلاً 9×7=63 → 6+3=9).', en: 'Multiplication is <span class="lhl">repeated addition</span>. For example, 7 × 8 means adding 7 eight times: 7+7+7+7+7+7+7+7 = 56.<br><br>Memorizing multiplication tables from 1 to 12 is one of the most important math skills. A useful pattern: For any number multiplied by 9, the sum of the digits in the product is 9 (e.g., 9×7=63 → 6+3=9).', zh: '乘法是 <span class="lhl">重复相加</span>。例如，7 × 8 表示将 7 加八次：7+7+7+7+7+7+7+7 = 56。<br><br>背诵 1 到 12 的乘法口诀表是最重要的数学技能之一。一个有用的规律：任何数字乘以 9，结果各位数字之和为 9（例如，9×7=63 → 6+3=9）。' }
      },
      {
        title: { ar: 'الأعداد الأولية', en: 'Prime Numbers', zh: '质数' },
        body: { ar: 'العدد الأولي هو <span class="lhl">عدد لا يقبل القسمة إلا على 1 وعلى نفسه</span>. الأعداد الأولية الأولى: 2، 3، 5، 7، 11، 13، 17، 19، 23…<br><br>ملاحظات مهمة:<br>• الرقم 1 ليس أولياً بالاتفاق بين العلماء.<br>• 2 هو العدد الأولي الزوجي الوحيد.<br>• منخل إراتوستينس هو أشهر خوارزمية لإيجاد الأعداد الأولية.', en: 'A prime number is <span class="lhl">a natural number greater than 1 that has no positive divisors other than 1 and itself</span>. The first prime numbers: 2, 3, 5, 7, 11, 13, 17, 19, 23…<br><br>Important notes:<br>• By convention, 1 is not considered prime.<br>• 2 is the only even prime number.<br>• The Sieve of Eratosthenes is a famous algorithm for finding primes.', zh: '质数是 <span class="lhl">大于 1 且除了 1 和它自身以外不再有其他正因数的自然数</span>。最初的质数有：2, 3, 5, 7, 11, 13, 17, 19, 23…<br><br>重要提示：<br>• 根据定义，1 不是质数。<br>• 2 是唯一的偶质数。<br>• 埃拉托斯特尼筛法是寻找质数最著名的算法。' }
      },
      {
        title: { ar: 'النسبة المئوية والكسور', en: 'Percentages and Fractions', zh: '百分比和分数' },
        body: { ar: 'النسبة المئوية تعني <span class="lhl">جزء من 100</span>. الرمز % يعني "لكل مئة".<br><br>للتحويل:<br>• من كسر إلى نسبة مئوية: اضرب في 100<br>• من نسبة مئوية إلى كسر: اقسم على 100 واختصر<br><br>مثال: 0.75 = 75/100 = 3/4. و 25% = 25/100 = 1/4.', en: 'Percentage means <span class="lhl">parts per 100</span>. The symbol % means "out of a hundred".<br><br>To convert:<br>• Fraction to percentage: multiply by 100<br>• Percentage to fraction: divide by 100 and simplify<br><br>Example: 0.75 = 75/100 = 3/4. And 25% = 25/100 = 1/4.', zh: '百分比表示 <span class="lhl">每一百中的份额</span>。符号 % 的意思是 "每一百"。<br><br>转换方法：<br>• 分数转百分比：乘以 100<br>• 百分比转分数：除以 100 并化简<br><br>例如：0.75 = 75/100 = 3/4。而 25% = 25/100 = 1/4。' }
      }
    ],

    sci: [
      {
        title: { ar: 'المجموعة الشمسية', en: 'The Solar System', zh: '太阳系' },
        body: { ar: 'تتكون مجموعتنا الشمسية من <span class="lhl">8 كواكب</span> تدور حول نجم واحد هو الشمس: عطارد، الزهرة، الأرض، المريخ (الكواكب الصخرية)، ثم المشتري، زحل، أورانوس، نبتون (الكواكب الغازية العملاقة).<br><br>المشتري هو الأكبر — عاصفته "البقعة الحمراء العظيمة" أكبر من الأرض ومستمرة منذ قرون. أما زحل فيتميز بحلقاته الجميلة المكونة من الجليد والصخور والغبار.', en: 'Our solar system consists of <span class="lhl">8 planets</span> orbiting a single star, the Sun: Mercury, Venus, Earth, Mars (the terrestrial planets), then Jupiter, Saturn, Uranus, Neptune (the gas giants).<br><br>Jupiter is the largest — its "Great Red Spot" storm is larger than Earth and has raged for centuries. Saturn is known for its beautiful rings made of ice, rock, and dust.', zh: '我们的太阳系由<span class="lhl"> 8 颗行星</span>组成，它们围绕着一颗恒星——太阳运行：水星、金星、地球、火星（类地行星），然后是木星、土星、天王星、海王星（气态巨行星）。<br><br>木星是最大的——它的 "大红斑" 风暴比地球还大，并且已经持续了几个世纪。土星以其由冰、岩石和尘埃构成的美丽光环而闻名。' }
      },
      {
        title: { ar: 'الجدول الدوري للعناصر', en: 'The Periodic Table of Elements', zh: '元素周期表' },
        body: { ar: 'رتب العالم <span class="lhl">مندليف</span> العناصر الكيميائية في جدول حسب:<br>• العدد الذري (عدد البروتونات)<br>• الخصائص الكيميائية المتشابهة<br><br>الجدول الدوري الحديث يضم 118 عنصراً، منها 92 عنصراً طبيعياً والباقي مُصنّع. كل عنصر له رمز كيميائي (مثل H للهيدروجين، O للأكسجين، Fe للحديد، Au للذهب).', en: 'The scientist <span class="lhl">Mendeleev</span> arranged the chemical elements in a table according to:<br>• Atomic number (number of protons)<br>• Similar chemical properties<br><br>The modern periodic table contains 118 elements, of which 92 are naturally occurring and the rest are synthetic. Each element has a chemical symbol (e.g., H for Hydrogen, O for Oxygen, Fe for Iron, Au for Gold).', zh: '科学家<span class="lhl">门捷列夫</span>根据以下规则将化学元素排列成表格：<br>• 原子序数（质子数）<br>• 相似的化学性质<br><br>现代元素周期表包含 118 种元素，其中 92 种是天然存在的，其余是人工合成的。每种元素都有一个化学符号（例如，H 代表氢，O 代表氧，Fe 代表铁，Au 代表金）。' }
      }
    ],

    hist: [
      {
        title: { ar: 'نهاية الحرب الباردة', en: 'The End of the Cold War', zh: '冷战的结束' },
        body: { ar: 'رمز <span class="lhl">سقوط جدار برلين (9 نوفمبر 1989)</span> إلى نهاية الحرب الباردة بين المعسكر الشرقي (بقيادة الاتحاد السوفيتي) والمعسكر الغربي (بقيادة الولايات المتحدة).<br><br>بُني الجدار عام 1961 لتقسيم برلين إلى شطرين: شرقي (شيوعي) وغربي (رأسمالي). أدى سقوطه إلى توحيد ألمانيا في أكتوبر 1990، وانهيار الاتحاد السوفيتي في ديسمبر 1991.', en: 'The <span class="lhl">fall of the Berlin Wall (November 9, 1989)</span> symbolized the end of the Cold War between the Eastern Bloc (led by the Soviet Union) and the Western Bloc (led by the United States).<br><br>The wall was built in 1961 to divide Berlin into two parts: East (communist) and West (capitalist). Its fall led to the reunification of Germany in October 1990 and the collapse of the Soviet Union in December 1991.', zh: '<span class="lhl">柏林墙的倒塌（1989年11月9日）</span>象征着以苏联为首的东方集团和以美国为首的西方集团之间冷战的结束。<br><br>柏林墙建于1961年，目的是将柏林分为东（共产主义）和西（资本主义）两部分。它的倒塌导致了1990年10月德国的统一和1991年12月苏联的解体。' }
      },
      {
        title: { ar: 'الحضارة الإسلامية في الأندلس', en: 'Islamic Civilization in Al-Andalus', zh: '安达卢斯的伊斯兰文明' },
        body: { ar: 'ازدهرت <span class="lhl">الحضارة الإسلامية في الأندلس</span> (إسبانيا والبرتغال الحاليتين) لمدة تقارب 800 عام (711–1492م).<br><br>من أبرز إنجازاتها:<br>• جامع قرطبة الكبير<br>• قصر الحمراء في غرناطة<br>• مكتبة الحكم الثاني (400,000 كتاب)<br>• علماء كابن رشد وابن حزم والزهراوي في الطب', en: 'The <span class="lhl">Islamic civilization of Al-Andalus</span> (present-day Spain and Portugal) flourished for nearly 800 years (711–1492 CE).<br><br>Among its most notable achievements:<br>• The Great Mosque of Córdoba<br>• The Alhambra palace in Granada<br>• The library of Al-Hakam II (400,000 books)<br>• Scholars such as Ibn Rushd (Averroes), Ibn Hazm, and Al-Zahrawi (Abulcasis) in medicine.', zh: '<span class="lhl">安达卢斯的伊斯兰文明</span>（今西班牙和葡萄牙地区）繁荣了近 800 年（公元 711–1492 年）。<br><br>其最显著的成就包括：<br>• 科尔多瓦大清真寺<br>• 格拉纳达的阿罕布拉宫<br>• 哈卡姆二世的图书馆（藏有 40 万册书）<br>• 伊本·鲁世德（阿威罗伊）、伊本·哈兹姆、医学家扎赫拉维等学者。' }
      }
    ],

    geo: [
      {
        title: { ar: 'أنهار العالم العظيمة', en: 'Great Rivers of the World', zh: '世界伟大河流' },
        body: { ar: 'يُعد <span class="lhl">نهر النيل</span> بطول ~6,650 كم أطول أنهار العالم، ينبع من بحيرة فيكتوريا ويمر بـ11 دولة أفريقية قبل أن يصب في البحر المتوسط.<br><br>أما نهر <span class="lhl">الأمازون</span> في أمريكا الجنوبية فهو الأضخم من حيث كمية المياه المتدفقة — يحمل خمس مياه الأنهار العذبة في العالم. شكّلت الأنهار الكبرى حضارات إنسانية عظيمة: النيل ودجلة والفرات والسند والنهر الأصفر.', en: 'The <span class="lhl">Nile River</span>, at ~6,650 km long, is the longest river in the world. It originates from Lake Victoria and passes through 11 African countries before emptying into the Mediterranean Sea.<br><br>The <span class="lhl">Amazon River</span> in South America is the largest by volume of water flow — it carries one-fifth of the world\'s fresh river water. Great rivers have shaped great human civilizations: The Nile, Tigris, Euphrates, Indus, and Yellow River.', zh: '<span class="lhl">尼罗河</span>长约 6,650 公里，是世界上最长的河流。它发源于维多利亚湖，流经 11 个非洲国家，最终注入地中海。<br><br>南美洲的<span class="lhl">亚马逊河</span>是水量最大的河流——它承载了全球五分之一淡水的径流量。伟大的河流塑造了伟大的人类文明：尼罗河、底格里斯河、幼发拉底河、印度河和黄河。' }
      },
      {
        title: { ar: 'المناخ والعوامل المؤثرة فيه', en: 'Climate and Factors Affecting It', zh: '气候及其影响因素' },
        body: { ar: 'يتأثر مناخ أي منطقة بعدة عوامل:<br>• <span class="lhl">خط العرض</span>: كلما اقتربنا من خط الاستواء زادت الحرارة<br>• <span class="lhl">الارتفاع عن سطح البحر</span>: كلما ارتفعنا انخفضت الحرارة<br>• <span class="lhl">القرب من المسطحات المائية</span>: المناطق الساحلية أعتدل مناخاً<br>• <span class="lhl">التيارات البحرية</span>: تيارات دافئة أو باردة تؤثر على السواحل', en: 'The climate of any region is influenced by several factors:<br>• <span class="lhl">Latitude</span>: The closer to the equator, the higher the temperature<br>• <span class="lhl">Altitude</span>: The higher the elevation, the lower the temperature<br>• <span class="lhl">Proximity to water bodies</span>: Coastal areas have more moderate climates<br>• <span class="lhl">Ocean currents</span>: Warm or cold currents affect coastal climates', zh: '任何地区的气候都受多种因素影响：<br>• <span class="lhl">纬度</span>：越靠近赤道，温度越高<br>• <span class="lhl">海拔</span>：海拔越高，温度越低<br>• <span class="lhl">距水体的远近</span>：沿海地区气候更温和<br>• <span class="lhl">洋流</span>：暖流或寒流影响沿海气候' }
      }
    ],

    lit: [
      {
        title: { ar: 'ابن المقفع وكليلة ودمنة', en: 'Ibn al-Muqaffa and Kalila wa Dimna', zh: '伊本·穆卡法和《卡里来和笛木乃》' },
        body: { ar: 'عبد الله بن المقفع (724–759م) أحد أبرز كتّاب <span class="lhl">العصر العباسي الأول</span>. فارسي الأصل، اشتُهر بترجمة كتاب <span class="lhl">كليلة ودمنة</span> من الفارسية (البَهلوية) إلى العربية بأسلوب أدبي رفيع.<br><br>الكتاب مجموعة قصص حكمية على ألسنة الحيوانات (وأشهر شخصيتيه: كليلة ودمنة وهما ابنا آوى)، تحمل دروساً سياسية وأخلاقية. يُعدّ من روائع الأدب العربي وأثر في الأدب العالمي.', en: 'Abdullah Ibn al-Muqaffa (724–759 CE) was one of the most prominent writers of the <span class="lhl">early Abbasid era</span>. Of Persian origin, he became famous for translating the book <span class="lhl">Kalila wa Dimna</span> from Middle Persian (Pahlavi) into Arabic using a refined literary style.<br><br>The book is a collection of wisdom stories told by animals (its most famous characters are Kalila and Dimna, two jackals), containing political and moral lessons. It is considered a masterpiece of Arabic literature and has influenced world literature.', zh: '阿卜杜拉·伊本·穆卡法（公元724–759年）是<span class="lhl">阿拔斯王朝早期</span>最杰出的作家之一。他原是波斯人，因将《<span class="lhl">卡里来和笛木乃</span>》从中古波斯语（巴列维语）翻译成阿拉伯语，并采用优美的文学风格而闻名。<br><br>这本书是一系列通过动物口述的智慧故事（其中最著名的角色是两只豺狼卡里来和笛木乃），包含了政治和道德教训。它被认为是阿拉伯文学的杰作，并对世界文学产生了影响。' }
      },
      {
        title: { ar: 'بحور الشعر العربي', en: 'Meters of Arabic Poetry', zh: '阿拉伯诗歌的格律' },
        body: { ar: 'وضع <span class="lhl">الخليل بن أحمد الفراهيدي</span> علم العروض الذي حدد 16 بحراً شعرياً، لكل بحر تفعيلاته الموسيقية الخاصة.<br><br>أشهر البحور:<br>• <span class="lhl">الطويل</span>: طويلٌ له دون البحور فضائلٌ<br>• <span class="lhl">الكامل</span>: أكملُ البحور وأكثرها استخداماً<br>• <span class="lhl">البسيط</span>: سهل ممتنع<br>• <span class="lhl">الوافر</span>: سمي بذلك لوفور حركاته', en: '<span class="lhl">Al-Khalil ibn Ahmad al-Farahidi</span> developed the science of prosody (Al-\'Arud), which defines 16 poetic meters (buhur), each with its own musical feet.<br><br>The most famous meters:<br>• <span class="lhl">At-Tawil (The Long)</span>: Known for its virtues over other meters<br>• <span class="lhl">Al-Kamil (The Perfect)</span>: Considered the most complete and widely used<br>• <span class="lhl">Al-Basit (The Extended)</span>: Simple yet profound<br>• <span class="lhl">Al-Wafir (The Ample)</span>: Named for its abundance of vowels', zh: '<span class="lhl">哈利勒·伊本·艾哈迈德·法拉希迪</span>创立了韵律学，定义了 16 种诗律，每种诗律都有其特定的音步。<br><br>最著名的格律：<br>• <span class="lhl">长律（At-Tawil）</span>：以优于其他格律而著称<br>• <span class="lhl">全律（Al-Kamil）</span>：被认为最完美、最常用<br>• <span class="lhl">简律（Al-Basit）</span>：简单又耐人寻味<br>• <span class="lhl">足律（Al-Wafir）</span>：因其音节元音丰富而得名' }
      }
    ],

    bio: [
      {
        title: { ar: 'الخلية: وحدة الحياة', en: 'The Cell: The Unit of Life', zh: '细胞：生命的基本单位' },
        body: { ar: 'كل الكائنات الحية مبنية من <span class="lhl">خلايا</span> — من البكتيريا وحيدة الخلية إلى الإنسان الذي يحتوي على تريليونات الخلايا.<br><br>تنص <span class="lhl">نظرية الخلية</span> (1839) على:<br>1. كل الكائنات الحية تتكون من خلية أو أكثر<br>2. الخلية هي الوحدة الأساسية للتركيب والوظيفة<br>3. كل الخلايا تنشأ من خلايا موجودة مسبقاً', en: 'All living organisms are made of <span class="lhl">cells</span> — from single-celled bacteria to humans, who are made of trillions of cells.<br><br>The <span class="lhl">Cell Theory</span> (1839) states:<br>1. All living things are composed of one or more cells<br>2. The cell is the basic unit of structure and organization in organisms<br>3. All cells arise from pre-existing cells', zh: '所有生物体都由<span class="lhl">细胞</span>构成——从单细胞细菌到由数万亿个细胞组成的人类。<br><br><span class="lhl">细胞学说</span>（1839）指出：<br>1. 所有生物体都由一个或多个细胞组成<br>2. 细胞是生物体结构和功能的基本单位<br>3. 所有细胞都来自已有的细胞' }
      },
      {
        title: { ar: 'التمثيل الضوئي والتنفس الخلوي', en: 'Photosynthesis and Cellular Respiration', zh: '光合作用与细胞呼吸' },
        body: { ar: '<span class="lhl">التمثيل الضوئي</span>: عملية تقوم بها النباتات لتحويل ثاني أكسيد الكربون والماء إلى جلوكوز وأكسجين باستخدام ضوء الشمس. المعادلة:<br>6CO₂ + 6H₂O + ضوء → C₆H₁₂O₆ + 6O₂<br><br><span class="lhl">التنفس الخلوي</span>: عملية عكسية تتم في الميتوكوندريا لتحرير الطاقة من الجلوكوز:<br>C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O + طاقة (ATP)', en: '<span class="lhl">Photosynthesis</span>: The process by which plants convert carbon dioxide and water into glucose and oxygen using sunlight. Equation:<br>6CO₂ + 6H₂O + Light → C₆H₁₂O₆ + 6O₂<br><br><span class="lhl">Cellular Respiration</span>: The opposite process that occurs in mitochondria to release energy from glucose:<br>C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O + Energy (ATP)', zh: '<span class="lhl">光合作用</span>：植物利用阳光将二氧化碳和水转化为葡萄糖和氧气的过程。方程式：<br>6CO₂ + 6H₂O + 光能 → C₆H₁₂O₆ + 6O₂<br><br><span class="lhl">细胞呼吸</span>：在线粒体中发生的、从葡萄糖中释放能量的相反过程：<br>C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O + 能量（ATP）' }
      }
    ]
  },

  // ── HELPER METHODS ────────────────────────────────────────
  
  /**
   * Get a subject by ID
   * @param {string} id - Subject ID
   * @returns {Object|undefined} Subject object
   */
  getSubject(id) {
    return this.subjects.find(s => s.id === id);
  },

  /**
   * Get questions for a subject (shuffled)
   * @param {string} subjectId - Subject ID
   * @param {number} count - Number of questions (default: 5)
   * @param {string} lang - Language code for localization
   * @returns {Array} Shuffled questions array
   */
  getQuestions(subjectId, count = 5, lang = 'ar') {
    const questions = [...(this.q[subjectId] || this.q.math)].map(q => this.localizeQuestion(q, lang));
    
    // Fisher-Yates shuffle
    for (let i = questions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [questions[i], questions[j]] = [questions[j], questions[i]];
    }
    
    // Return requested number
    return questions.slice(0, count);
  },

  /**
   * Localize a generic string or translated object
   * @param {string|Object} value
   * @param {string} lang
   * @returns {string}
   */
  localize(value, lang = 'ar') {
    if (typeof value === 'object' && value !== null) {
      return value[lang] || value.ar || '';
    }
    return value || '';
  },

  /**
   * Localize a question entry for the current language
   * @param {Object} question
   * @param {string} lang
   * @returns {Object}
   */
  localizeQuestion(question, lang = 'ar') {
    return {
      ...question,
      q: this.localize(question.q, lang),
      opts: question.opts.map(opt => this.localize(opt, lang)),
      hint: this.localize(question.hint, lang)
    };
  },

  /**
   * Get all questions for a subject (unshuffled)
   * @param {string} subjectId - Subject ID
   * @param {string} lang - Language code for localization
   * @returns {Array} All questions
   */
  getAllQuestions(subjectId, lang = 'ar') {
    return (this.q[subjectId] || this.q.math || []).map(q => this.localizeQuestion(q, lang));
  },

  /**
   * Get lessons for a subject
   * @param {string} subjectId - Subject ID
   * @returns {Array} Lessons array
   */
  getLessons(subjectId, lang = 'ar') {
    return (this.lessons[subjectId] || this.lessons.math || []).map(lesson => this.localizeLesson(lesson, lang));
  },

  /**
   * Localize a lesson entry
   * @param {Object} lesson
   * @param {string} lang
   * @returns {Object}
   */
  localizeLesson(lesson, lang = 'ar') {
    return {
      title: this.localize(lesson.title, lang),
      body: this.localize(lesson.body, lang)
    };
  },

  /**
   * Get question count for a subject
   * @param {string} subjectId - Subject ID
   * @returns {number}
   */
  getQuestionCount(subjectId) {
    return (this.q[subjectId] || []).length;
  },

  /**
   * Get lesson count for a subject
   * @param {string} subjectId - Subject ID
   * @returns {number}
   */
  getLessonCount(subjectId) {
    return (this.lessons[subjectId] || []).length;
  }
};