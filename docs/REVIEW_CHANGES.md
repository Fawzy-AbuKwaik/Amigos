# مراجعة Daily Check-in وAssessment

تم تعديل الملفات مباشرة في المشروع. لم يتم تنفيذ Commit أو Push.

| الملف | التعديل |
| --- | --- |
| `js/data.js` | إضافة مرجع NHLBI لتوصية انخفاض الضغط ومرجع NASA للنوم؛ إزالة افتراض أن انخفاض الضغط يثبت نقص السوائل؛ تعديل بعض نصوص دعم الأعراض والماء والتمرين لتتبع خطة المهمة. |
| `js/medical.js` | قراءة Mind & Mood من الإجابات الحالية وعرض المتوسط بشكل وصفي؛ فصل توصيات المزاج والنوم القصير والنوم الطويل؛ عرض فئات النوم والماء والتمرين في البطاقات والسجل المرتبط والتقرير؛ إزالة تقييم الماء والتمرين مقابل متوسط شخصي ±20%. |
| `js/medical.js` | عدم رسم أو حساب متوسط للقيم التمثيلية للفئات؛ استبدال الرسم التجميعي غير المعتمد بعدد التسجيلات اليومية؛ إزالة نسب الصحة من الدوائر؛ فصل القراءات التجريبية عن الشخصية. |
| `js/medical.js` | إعطاء الأعراض العاجلة الأولوية؛ إبقاء متابعة طبية عند غياب أجهزة الفحوصات؛ عدم اعتبار قراءة رديئة أو سابقة للعرض فحص متابعة؛ تعطيل تصنيف النطاقات المعلّمة PLACEHOLDER؛ تصحيح دقة إدخال البول إلى 0.001. |
| `js/app.js` | إعادة التحقق من النوم عند الحفظ النهائي؛ جعل أسئلة خطوة Activity الاختيارية غير إلزامية؛ حفظ الإجابة الرقمية الناقصة كقيمة null؛ توضيح أن Mind متوسط وصفي. |
| `index.html`, `css/medical.css` | خيار لإظهار البيانات التجريبية مع تنبيه ظاهر؛ تسمية رسم عدد التسجيلات؛ توضيح معنى الدوائر؛ تنسيق Recorded بشكل محايد. |

فئات النوم الحالية: أول ثلاث فئات Below، وفئة 7–9 ساعات Normal، وأكثر من 9 ساعات Over. هذه مقارنة بمرجع التطبيق وليست تشخيصًا، ولا تتضمن توصية بتقليل النوم الطويل تلقائيًا. الماء والتمرين يظهران Recorded، بدون حكم على الكفاية.

Mind & Mood يعتمد على الإجابات المتوافقة ذات المقياس 1–5، ويُعرض كمتوسط وصفي فقط. اقتراح الدعم يعتمد على الإجابات الفردية المختارة، بدون تحويل المتوسط إلى تشخيص أو نسبة صحة. لا تدخل مقاييس AMS أو 0–10 في المتوسط الوصفي الحالي.

## الاختبارات

تشغيل الاختبارات:

```powershell
node scripts/test-app.cjs
node scripts/test-medical.cjs
python scripts/import_research.py --check
git diff --check
```

نجحت اختبارات app و18 مجموعة اختبارات medical، وفحص الاستيراد وفحص diff. اختبارات medical تستخدم الكود الفعلي مع DOM وstorage داخل الذاكرة، وتشمل الفئات، القيم الناقصة، عزل أفراد الفريق، التوصيات، العرض، الحفظ، والوضع التجريبي.

تم أيضًا اختبار المتصفح المحلي: تعبئة وحفظ Check-in كامل، انتقال البيانات إلى Assessment، ظهور المتوسط الوصفي 4/5 والفئات، إدخال ضغط 88/56، ظهور توصية إعادة القياس، تفعيل وتعطيل الوضع التجريبي، وعرض Case summary بالفئات الصحيحة. لم تظهر أخطاء console خلال هذه المسارات.

تنزيل تقرير التصدير لم يكتمل لأن إذن التنزيل من المتصفح رُفض. لا يُعتبر هذا الجزء مجتازًا، ولم يُختبر كل مسار تفاعلي ممكن أو كل مقاس شاشة.

## المصادر والحدود

- [NHLBI: Low Blood Pressure](https://www.nhlbi.nih.gov/health/low-blood-pressure)
- [NASA: Risk from Inadequate Sleep and Irregular Schedules](https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/)

المصادر توفر سياقًا للتوصيات؛ قواعد الأعراض والفحوصات في الواجهة ما زالت قواعد نموذج أولي وليست بروتوكولًا طبيًا معتمدًا. جداول البحث المستوردة تبقى منفصلة عن جداول الواجهة القديمة؛ لم يتم استبدال 14 فحصًا و35 عرضًا و20 سؤالًا تلقائيًا بكل محتويات ملف البحث.

اختيارات الفئات الموجودة سابقًا تستخدم قيمًا رقمية تمثيلية. العرض الحالي يعرضها كفئات عند تطابق القيمة مع تعريف الاختيار؛ السجلات القديمة لا تحمل معلومة كافية لتمييز قياس دقيق يطابق القيمة نفسها من اختيار فئة.


## File imports and additional tests

- Removed radiation dose from the active test catalog, preserving original
  workbook research and previously stored records.
- Added ECG and eye ultrasound file import. Reports/images/video are stored in
  IndexedDB; measurement metadata stays in localStorage. Supported files can be
  reopened from Recent readings; deleting a reading also removes its file.
- Maximum attachment size: 25 MB. Allowed extensions and MIME types are checked.
  Images and videos can be previewed; PDF reports open through a local blob URL.
  Files are not automatically analysed and are not bundled into the text summary.
- Added serum creatinine, eGFR, UACR, TSH, free T4, and cortisol numeric indicators,
  without automatic reference classification. Added echocardiogram, MRI, OCT,
  jugular ultrasound, and research-only CCFP report imports. There are now 24
  active tests. OCT is linked to both eyes and brain/CSF without duplicate
  recommendations or recording counts. Brain/CSF now has a body-map marker.
- New tests use clinician-directed scheduling and list unverified equipment
  availability. No invasive CSF procedure is offered or automatically recommended.
- Validation: 25 medical regression groups passed, including attachment format and
  size validation, async storage save/read/delete, form metadata persistence,
  rollback on metadata failure, and linkage of all additional indicators.
  App regression checks and diff checks passed. Upload/preview persistence has
  not been confirmed in a real browser: the latest browser preview timed out.
