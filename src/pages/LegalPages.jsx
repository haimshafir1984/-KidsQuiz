import { Link } from 'react-router-dom'
import { isDesktopRuntime } from '../utils/runtime'

// טיוטת טקסטים משפטיים. יש להעביר לאישור גורם משפטי של הלקוחה ולהחליף את הפרטים בסוגריים.
// כשהטקסטים מאושרים, משנים את LEGAL_DRAFT ל-false והבאנר "טיוטה" נעלם.
export const LEGAL_DRAFT = true
const CONTACT = '[כתובת מייל לפניות פרטיות]'
const OPERATOR = '[שם הגוף המפעיל את האתר]'

function Page({ title, children }) {
  return (
    <article className="edu-card mx-auto my-6 max-w-3xl text-right">
      {LEGAL_DRAFT && (
        <div role="note" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-base font-semibold text-amber-800">
          טיוטה: הטקסט ממתין לאישור סופי.
        </div>
      )}
      <h1 className="text-3xl font-bold text-slate-950">{title}</h1>
      <div className="mt-4 space-y-4 text-lg leading-8 text-slate-700">{children}</div>
      <div className="mt-6">
        <Link to="/welcome" className="btn-secondary">חזרה לעמוד הראשי</Link>
      </div>
    </article>
  )
}

const H = ({ children }) => <h2 className="pt-2 text-xl font-bold text-slate-950">{children}</h2>

export function PrivacyPage() {
  return (
    <Page title="מדיניות פרטיות">
      <p>האתר מופעל על ידי {OPERATOR}. מסמך זה מסביר איזה מידע נאסף, למה, ומה הזכויות שלכם.</p>
      <H>איזה מידע נאסף</H>
      <p>בהרשמה: שם פרטי, שם משפחה, עיר, כתובת מייל, סיסמה (נשמרת מוצפנת ולא ניתנת לקריאה), ולא חובה: טלפון ותאריך לידה. בזמן השימוש: תוצאות החידונים, ההתקדמות השמורה ומועד הכניסה האחרונה.</p>
      <H>למה המידע נאסף</H>
      <p>כדי לאפשר כניסה לחשבון, לשמור את ההתקדמות והתוצאות, להציג למנהלי המערכת את התלמידים והציונים, ולנהל את תקופת המנוי. המידע לא נמכר ולא משמש לפרסום.</p>
      <H>קטינים</H>
      <p>האתר מיועד גם לילדים ונוער. הרשמה של קטין מחייבת את הסכמת ההורים או האפוטרופוס, והם רשאים לבקש לעיין במידע או למחוק אותו.</p>
      <H>עם מי המידע משותף</H>
      <p>המידע נשמר בשרתים שמפעיל האתר. ספקי תשתית (אחסון ואבטחת תעבורה) מעבדים אותו רק לצורך הפעלת השירות. מנהלי המערכת רואים את פרטי התלמידים ותוצאותיהם.</p>
      <H>כמה זמן המידע נשמר</H>
      <p>כל עוד החשבון פעיל. רישומי תשלום (שם, סכום ותאריך) נשמרים גם אחרי מחיקה, לצורכי הנהלת חשבונות. אפשר לבקש מחיקה בכל עת, ובמסך "האזור האישי שלי" יש כפתורי הורדת הנתונים ומחיקת החשבון.</p>
      <H>עוגיות</H>
      <p>האתר משתמש בעוגייה אחת הכרחית לשמירת ההתחברות. אין עוגיות פרסום או מעקב.</p>
      <H>זכויות ופניות</H>
      <p>זכות עיון, תיקון ומחיקה: במסך האזור האישי, או בפנייה אל {CONTACT}.</p>
    </Page>
  )
}

export function TermsPage() {
  return (
    <Page title="תנאי שימוש">
      <p>השימוש באתר מותנה בהסכמה לתנאים אלה. האתר מופעל על ידי {OPERATOR}.</p>
      <H>מהות השירות</H>
      <p>האתר מציע חידונים ותרגול ללמידה. התכנים נועדו לתרגול ואינם מבטיחים הצלחה במבחן כלשהו.</p>
      <H>חשבון</H>
      <p>יש למסור פרטים נכונים ולשמור את הסיסמה בסוד. אסור להשתמש בחשבון של אחר. האחריות לפעולות בחשבון חלה על בעליו, ובמקרה של קטין על הוריו.</p>
      <H>מנוי</H>
      <p>בהרשמה ניתנת תקופת ניסיון. אחריה הגישה כפופה למנוי בתשלום, בהתאם לתנאים שיפורסמו. מועד סיום המנוי מוצג בחשבון.</p>
      <H>שימוש הולם וקניין רוחני</H>
      <p>אסור להעתיק, להפיץ או לאסוף את התכנים והשאלות בצורה אוטומטית, ואסור לפגוע בפעילות האתר. כל הזכויות בתכנים שמורות.</p>
      <H>הגבלת אחריות</H>
      <p>השירות ניתן כפי שהוא. ייתכנו הפסקות שירות או טעויות בתכנים, ואנו משתדלים לתקן אותן במהירות.</p>
      <H>שינויים</H>
      <p>אפשר לעדכן את התנאים מעת לעת. הגרסה העדכנית מפורסמת בדף זה.</p>
    </Page>
  )
}

export function AccessibilityPage() {
  return (
    <Page title="הצהרת נגישות">
      <p>אנו שואפים שהאתר יהיה נגיש ונוח לשימוש לכולם, כולל אנשים עם מוגבלויות.</p>
      <H>מה נעשה</H>
      <p>האתר מותאם לקריאה מימין לשמאל, עם גופן גדול וברור, ניגודיות גבוהה, ניווט במקלדת, חלונות עם תיוג נגיש, והתאמה לטלפון, ללוח ולמחשב. האנימציות מכבדות את הגדרת "הפחתת תנועה" של המכשיר.</p>
      <H>מה עדיין חסר</H>
      <p>ייתכן שחלק מהתכנים, למשל תמונות בשאלות, אינם כוללים תיאור טקסטואלי. אנו עובדים על השלמתם.</p>
      <H>פנייה בנושא נגישות</H>
      <p>נתקלתם בבעיה? פנו אל רכז הנגישות: {CONTACT}. נשתדל להשיב בהקדם.</p>
    </Page>
  )
}

const CREDIT_URL = 'https://flowsbiz.com/'

// קרדיט לבונה האתר. בגרסת הדסקטופ קישורים חיצוניים חסומים (ואין בהכרח אינטרנט), ולכן שם מוצג טקסט בלבד
function SiteCredit() {
  const name = <bdi dir="ltr">flowsbiz</bdi>
  return (
    <p className="mt-3 text-sm text-slate-500">
      אתר זה נבנה ע״י{' '}
      {isDesktopRuntime() ? name : (
        <a href={CREDIT_URL} target="_blank" rel="noopener" className="font-semibold underline hover:text-slate-900">
          {name}
          <span className="sr-only"> (נפתח בלשונית חדשה)</span>
        </a>
      )}
    </p>
  )
}

export function LegalFooter() {
  return (
    <footer className="mx-auto mt-6 w-full max-w-5xl px-4 pb-8 text-center text-base text-slate-600 sm:px-6 lg:px-8">
      <nav aria-label="מידע משפטי" className="flex flex-wrap justify-center gap-x-6 gap-y-2">
        <Link to="/terms" className="underline hover:text-slate-900">תנאי שימוש</Link>
        <Link to="/privacy" className="underline hover:text-slate-900">מדיניות פרטיות</Link>
        <Link to="/accessibility" className="underline hover:text-slate-900">הצהרת נגישות</Link>
      </nav>
      <SiteCredit />
    </footer>
  )
}
