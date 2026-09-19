import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json();
    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: 'प्रश्न खाली छ' }, { status: 400 });
    }

    const q = question.toLowerCase();

    // Match grounded recipes
    if (q.includes('उमेर') || q.includes('age') || q.includes('जन्म')) {
      return NextResponse.json({
        answer: 'नेपाली भाषामा उमेर गणना गर्न उमेर("YYYY-MM-DD") वा दिन_फरक(आज(), जन्ममिति) प्रयोग गर्न सकिन्छ।',
        codeSnippet: '// उमेर गणना गर्ने तरिका\nराखौँ जन्म = "2000-05-14"।\nराखौँ वर्ष = उमेर(जन्म)।\nभनौँ("उमेर:", वर्ष, "वर्ष")।'
      });
    }

    if (q.includes('मिति') || q.includes('date') || q.includes('आज') || q.includes('दिन')) {
      return NextResponse.json({
        answer: 'मिति सम्बन्धी काम गर्न आज(), दिन_फरक(मिति२, मिति१), र हप्ताको_दिन(मिति) उपलब्ध छन्।',
        codeSnippet: 'राखौँ आजको = आज()।\nभनौँ("आजको मिति:", आजको)।\nभनौँ("आजको बार:", हप्ताको_दिन(आजको))।\nराखौँ अन्तर = दिन_फरक("2026-12-31", "2026-01-01")।\nभनौँ("दिन अन्तर:", अन्तर)।'
      });
    }

    if (q.includes('इनपुट') || q.includes('input') || q.includes('सोध्नु')) {
      return NextResponse.json({
        answer: 'प्रयोगकर्ताबाट इनपुट लिन इनपुट("प्रश्न") प्रयोग गरिन्छ।',
        codeSnippet: 'राखौँ नाम = इनपुट("तपाईंको नाम के हो? ")।\nभनौँ("नमस्ते,", नाम)।'
      });
    }

    if (q.includes('लुप') || q.includes('loop') || q.includes('while') || q.includes('दोहोर')) {
      return NextResponse.json({
        answer: 'नेपाली भाषामा लुपको लागि भएसम्म condition { ... } प्रयोग हुन्छ।',
        codeSnippet: 'राखौँ i = 1।\nभएसम्म i <= 5 {\n  भनौँ("अंक:", i)।\n  i = i + 1।\n}'
      });
    }

    if (q.includes('फाइल') || q.includes('file') || q.includes('पढ्ने') || q.includes('लेख्ने')) {
      return NextResponse.json({
        answer: 'फाइल पढ्न ओएस_पढ्नुहोस्(path) र लेख्न ओएस_लेख्नुहोस्(path, content) प्रयोग गर्नुहोस् (OS मोडमा मात्र चल्छ)।',
        codeSnippet: 'ओएस_लेख्नुहोस्("test.txt", "नमस्ते नेपाल")।\nराखौँ सामग्री = ओएस_पढ्नुहोस्("test.txt")।\nभनौँ("फाइलको सामग्री:", सामग्री)।'
      });
    }

    if (q.includes('डाटाबेस') || q.includes('database') || q.includes('sqlite')) {
      return NextResponse.json({
        answer: 'डाटाबेस चलाउन डाटाबेस_चलाउनुहोस्(db, query) र सोध्न डाटाबेस_सोध्नुहोस्(db, query) प्रयोग गर्नुहोस्।',
        codeSnippet: 'डाटाबेस_चलाउनुहोस्("store.db", "CREATE TABLE IF NOT EXISTS items (id INTEGER, name TEXT);")।\nडाटाबेस_चलाउनुहोस्("store.db", "INSERT INTO items VALUES (1, \'कलम\');")।\nराखौँ डेटा = डाटाबेस_सोध्नुहोस्("store.db", "SELECT * FROM items;")।\nभनौँ(डेटा)।'
      });
    }

    // General explanation
    return NextResponse.json({
      answer: 'नेपाली प्रोग्रामिङ भाषामा:\n- भेरिएबल: राखौँ नाम = मान।\n- फङ्सन: काम नाम(प्यारामिटर) { पठाउँ मान। }\n- सर्त: यदि सर्त { ... } नत्र { ... }\n- प्रिन्ट: भनौँ(मान)।\n- मिति: आज(), दिन_फरक(), उमेर()\n- इनपुट: इनपुट("प्रश्न")',
      codeSnippet: '// सामान्य ढाँचा\nकाम जोड(क, ख) {\n  पठाउँ क + ख।\n}\nभनौँ("जोडफल:", जोड(10, 20))।'
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
