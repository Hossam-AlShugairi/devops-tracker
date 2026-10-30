# 🚀 DevOps Study Plan Tracker (خطة DevOps 2027)

تطبيق متكامل لمتابعة خطة دراسة الـ DevOps والانتقال الوظيفي حتى أبريل 2027. مبني بالكامل لدعم اللغة العربية واتجاه اليمين لليسار (RTL)، مع تزامن فوري لقاعدة البيانات، وسجل مذاكرة يومي، وتقارير أسبوعية، وتحليلات التزام دقيقة، وإمكانية تعديل الخطة وترحيل المواعيد.

---

## 🌟 المميزات الرئيسية

1. **التقدم والالتزام بالخطة (Metrics & Adherence)**:
   - نسبة الإنجاز الفعلي مقارنة بالمفروض الوصول له اليوم بناءً على تواريخ الاستحقاق (`Expected progress %`).
   - نسبة الالتزام (`Adherence bar`): نسبة المواضيع المستحقة التي أُنجزت بالفعل مع رسالة توضح هل أنت متقدم أو متأخر عن الجدول.
   - تنبيه أحمر تفاعلي بالمواضيع المتأخرة وعدد أيام التأخير.
2. **قائمة المواضيع والكورسات التفاعلية**:
   - فلترة ذكية: (الكل، الأسبوع ده، متأخر، لسه، خلص، وبحسب كل كورس).
   - بطاقات تقدم لكل كورس مع ألوان مخصصة ونسبة إنجاز لحظية.
   - وسوم ديناميكية: "✓ خلص (مع تاريخ الإنجاز)"، "متأخر X يوم"، "باقي X يوم".
3. **وضع التعديل الكامل (Edit Mode)**:
   - إضافة، تعديل، وحذف المواضيع والكورسات.
   - تعديل تواريخ الاستحقاق، الألوان، وترتيب العناصر.
   - حقل ملاحظات وروابط مفيدة لكل موضوع.
4. **سجل المذاكرة اليومي والستريك (Daily Study Log & Streaks)**:
   - تسجيل ساعات المذاكرة اليومية مقابل الهدف (2 ساعة / يوم افتراضياً).
   - حساب الستريك الحالي وأطول ستريك متتالي تلقائياً.
   - رسم بياني أسبوعي يوضح مدى تحقيق الهدف لكل يوم من الأيام السبعة الأخيرة.
5. **مخطط النشاط التفاعلي (GitHub-style Activity Heatmap)**:
   - خريطة حرارية تفاعلية توضح كثافة الإنجاز وساعات المذاكرة على مدار آخر 120 يوماً.
6. **التقرير الأسبوعي (Weekly Report)**:
   - ما تم إنجازه خلال الأسبوع الجاري.
   - المواضيع الفائتة / المتأخرة.
   - خطة ومستهدفات الأسبوع القادم.
   - نسبة الإنجاز في الميعاد (`On-time completion rate`).
7. **إعادة الجدولة السلسة (Reschedule Action)**:
   - ترحيل مواعيد جميع المواضيع المتبقية غير المكتملة بمقدار $N$ يوماً للأمام بنقرة واحدة عند حدوث أي ظرف طارئ، دون المساس بتواريخ المواضيع المنجزة.
8. **المرحلة الثانية (Phase 2)**:
   - تضمين كورسات إضافية (شهادات CKA و CompTIA Security+) تظل مخفية حتى يتم تفعيلها من صفحة الإعدادات بعد إتمام المرحلة الأولى في مايو 2027.
9. **النسخ الاحتياطي وإعادة الضبط**:
   - تصدير واستيراد البيانات كملف JSON كامل.
   - إعادة ضبط الإنجاز والسجل بكلمة تأكيد واضحة (`إعادة ضبط`).
10. **الأمان والتزامن عبر الأجهزة**:
    - مصادقة مستخدم فردي عبر كلمة مرور مشفرة (`bcrypt`) ورمز JWT في كوكيز `httpOnly`.
    - حفظ البيانات وتزامنها عبر قاعدة بيانات SQLite سريعة وفعالة ومحفوظة على الخادم.

---

## 🛠️ البنية التقنية (Tech Stack & Architecture)

- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS (RTL support, Cairo font, Dark/Light mode).
- **Backend**: Node.js + Express + TypeScript + SQLite (`node:sqlite`), Zod validation, JWT cookies.
- **Timezone**: حسابات الأيام وتواريخ "النهاردة" مضبوطة دائماً على توقيت القاهرة (`Africa/Cairo`).
- **Containerization**: Multi-stage `Dockerfile` + `docker-compose.yml` مع Persistent Volume لقاعدة البيانات.
- **CI/CD**: GitHub Actions workflow للفحص والتحقق (`vitest`, `lint`, `typecheck`) وبناء وتوزيع صورة الـ Docker.

```text
devops-tracker/
├── client/              # تطبيق React والواجهة الأمامية
│   ├── src/
│   │   ├── components/  # المكونات المشتركة (Header, Login, Heatmap)
│   │   ├── pages/       # الصفحات (Dashboard, Topics, StudyLog, WeeklyReport, Settings)
│   │   ├── context/     # إدارة الحالة (AuthContext, ToastContext)
│   │   └── utils/       # مساعدات الاتصال بالـ API وتنسيق التواريخ العربية
│   └── vite.config.ts
├── server/              # خادم Express وقاعدة البيانات
│   ├── src/
│   │   ├── auth.ts      # المصادقة والكوكيز
│   │   ├── db.ts        # إعداد جداول SQLite وبذر البيانات التلقائي (Seeding)
│   │   ├── routes.ts    # جميع مسارات الـ REST API
│   │   └── index.ts     # نقطة انطلاق الخادم وتوصيل الملفات الثابتة
│   └── tsconfig.json
├── shared/              # الكود المشترك (Types, Pure Calculations, Seed Data)
│   ├── types.ts
│   ├── calculations.ts  # معادلات التقدم والالتزام والستريك وترحيل المواعيد
│   └── seedData.ts      # بيانات الكورسات المستخرجة من النموذج المبدئي
├── tests/               # اختبارات Vitest للعمليات الحسابية والمنطق
├── Dockerfile           # بناء متعدد المراحل للإنتاج
├── docker-compose.yml   # تشغيل الحاوية ومجلد التخزين الدائم
└── .github/workflows/   # مسار عمل GitHub Actions
```

---

## 🚀 التشغيل السريع محلياً (Local Development)

### المتطلبات
- Node.js 22 أو أحدث
- npm

### خطوات التشغيل
1. استنسخ المشروع وادخل المجلد:
   ```bash
   cd devops-tracker
   ```
2. تثبيت الحزم:
   ```bash
   npm install
   cd client && npm install && cd ..
   ```
3. إعداد ملف البيئة:
   ```bash
   cp .env.example .env
   ```
4. تشغيل الاختبارات:
   ```bash
   npm test
   ```
5. تشغيل بيئة التطوير (الخادم والواجهة معاً):
   ```bash
   npm run dev
   ```
   - الواجهة: `http://localhost:5173`
   - الخادم: `http://localhost:3000`
   - كلمة المرور الافتراضية: `devops2027`

---

## 🐳 التشغيل بواسطة Docker Compose

لتشغيل التطبيق كحاوية متكاملة في الإنتاج مع حفظ دائم للبيانات:

```bash
docker compose up -d --build
```

افتح المتصفح على: `http://localhost:3000`  
البيانات ستحفظ بشكل دائم في مجلد الحاوية `devops-tracker-sqlite-data`.

---

## 🌐 دليل النشر على خادم سحابي (VPS / Oracle Cloud Always Free)

التطبيق خفيف جداً ومثالي للعمل على خادم مجاني مثل **Oracle Cloud Free Tier (Ampere A1 أو AMD Micro)** أو خادم VPS صغير (1GB RAM):

1. **تثبيت Docker & Docker Compose على السيرفر**:
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh
   ```
2. **سحب الكود وضبط المتغيرات**:
   ```bash
   git clone <REPO_URL> devops-tracker
   cd devops-tracker
   nano .env
   # قم بتغيير JWT_SECRET و APP_PASSWORD إلى قيم قوية خاصة بك
   ```
3. **تشغيل الحاوية**:
   ```bash
   docker compose up -d --build
   ```
4. **إعداد Nginx Reverse Proxy و SSL (Let's Encrypt)**:
   ```nginx
   server {
       server_name tracker.yourdomain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
   ثم استخراج شهادة الأمان:
   ```bash
   sudo certbot --nginx -d tracker.yourdomain.com
   ```

---

## 📷 واجهات التطبيق (UI Preview)

- **لوحة التحكم الرئيسية**: بطاقات التقدم، شريط الالتزام، التنبيهات، خريطة النشاط الحرارية (Heatmap)، وبطاقات الكورسات.
- **صفحة المواضيع**: فلاتر سريعة، وضع التعديل (Edit mode)، تتبع الملاحظات والمواعيد.
- **سجل المذاكرة**: رسم بياني أسبوعي، تتبع الستريك اليومي، وإحصائيات الساعات.
- **التقرير الأسبوعي**: استعراض دقيق لما أُنجز وما فات وخطة الأسبوع القادم.
- **الإعدادات**: إدارة كلمة المرور، تفعيل Phase 2، النسخ الاحتياطي والاستيراد، وإعادة الضبط الآمنة.
