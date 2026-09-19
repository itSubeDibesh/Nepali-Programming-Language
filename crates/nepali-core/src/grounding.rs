//! What the embedded AI is told about the language and the OS it lives in.
//!
//! A small local model knows nothing about this language or this OS, so
//! every grounded prompt starts with a compact guide. The language
//! examples below are real programs: `tests` runs each one and checks its
//! output, so the guide the AI reads cannot drift away from what the
//! interpreter actually does.

use alloc::format;
use alloc::string::String;
use alloc::vec::Vec;

pub struct Recipe {
    pub title: &'static str,
    /// Lowercase words (English or Devanagari) that make this recipe relevant.
    pub keywords: &'static [&'static str],
    pub code: &'static str,
    /// Expected output when run with no host access; `None` for recipes that
    /// need real files/commands/database/AI (those are only checked to
    /// parse and resolve).
    pub prints: Option<&'static str>,
}

/// Verified programs the AI copies from. Small models invent Devanagari
/// code badly but copy well, so each question retrieves the most relevant
/// few of these (see `relevant_recipes`).
pub const RECIPES: &[Recipe] = &[
    Recipe {
        title: "print hello",
        keywords: &["print", "hello", "namaste", "say", "display", "show", "छाप", "नमस्ते"],
        code: "भनौँ(\"नमस्ते संसार\")।",
        prints: Some("नमस्ते संसार"),
    },
    Recipe {
        title: "variables and arithmetic",
        keywords: &["variable", "add", "sum", "calculate", "math", "multiply", "arithmetic", "जोड", "गुणन"],
        code: "राखौँ क = 7।\nराखौँ ख = 5।\nभनौँ(क + ख, क * ख)।",
        prints: Some("12 35"),
    },
    Recipe {
        title: "loop: print numbers 1 to 3",
        keywords: &["loop", "repeat", "count", "numbers", "while", "times", "iterate", "लुप", "दोहोर"],
        code: "राखौँ i = 1।\nभएसम्म i <= 3 {\n  भनौँ(i)।\n  i = i + 1।\n}",
        prints: Some("1\n2\n3"),
    },
    Recipe {
        title: "function that adds two numbers",
        keywords: &["function", "define", "return", "def", "फङ्सन", "काम"],
        code: "काम जोड(क, ख) {\n  पठाउँ क + ख।\n}\nभनौँ(जोड(2, 3))।",
        prints: Some("5"),
    },
    Recipe {
        title: "factorial (recursion)",
        keywords: &["factorial", "recursion", "recursive", "क्रमगुणित"],
        code: "काम क्रमगुणित(न) {\n  यदि न <= 1 {\n    पठाउँ 1।\n  }\n  पठाउँ न * क्रमगुणित(न - 1)।\n}\nभनौँ(क्रमगुणित(5))।",
        prints: Some("120"),
    },
    Recipe {
        title: "fibonacci",
        keywords: &["fibonacci", "fib", "फिबोनाची"],
        code: "काम फिबो(अ) {\n  यदि अ < 2 {\n    पठाउँ अ।\n  }\n  पठाउँ फिबो(अ - 1) + फिबो(अ - 2)।\n}\nभनौँ(फिबो(10))।",
        prints: Some("55"),
    },
    Recipe {
        title: "array: sum of items",
        keywords: &["array", "list", "total", "items", "each", "सूची", "योग"],
        code: "राखौँ सूची = [4, 8, 15]।\nराखौँ योग = 0।\nराखौँ i = 0।\nभएसम्म i < लम्बाइ(सूची) {\n  योग = योग + सूची[i]।\n  i = i + 1।\n}\nभनौँ(योग)।",
        prints: Some("27"),
    },
    Recipe {
        title: "if and else: even or odd",
        keywords: &["if", "else", "condition", "compare", "check", "even", "odd", "यदि", "नत्र"],
        code: "राखौँ न = 7।\nयदि न % 2 == 0 {\n  भनौँ(\"जोर\")।\n} नत्र {\n  भनौँ(\"बिजोर\")।\n}",
        prints: Some("बिजोर"),
    },
    Recipe {
        title: "strings: length and joining",
        keywords: &["string", "text", "length", "character", "concat", "join", "शब्द", "अक्षर"],
        code: "भनौँ(लम्बाइ(\"नेपाल\"), \"नमस्ते \" + \"संसार\")।",
        prints: Some("5 नमस्ते संसार"),
    },
    Recipe {
        title: "read a file",
        keywords: &["file", "read", "open", "cat", "content", "फाइल", "पढ"],
        code: "भनौँ(ओएस_पढ्नुहोस्(\"/etc/hostname\"))।",
        prints: None,
    },
    Recipe {
        title: "run a Linux command and print its output",
        keywords: &["command", "run", "ls", "shell", "execute", "process", "आदेश"],
        code: "राखौँ नतिजा = आदेश_चलाउनुहोस्(\"ls\", [\"/tmp\"])।\nभनौँ(नतिजा[1])।",
        prints: None,
    },
    Recipe {
        title: "SQLite database",
        keywords: &["database", "sqlite", "table", "sql", "store", "save", "डाटाबेस"],
        code: "डाटाबेस_चलाउनुहोस्(\"CREATE TABLE IF NOT EXISTS मान (नाम TEXT, संख्या INTEGER)\")।\nडाटाबेस_चलाउनुहोस्(\"INSERT INTO मान VALUES ('क', 1)\")।\nभनौँ(डाटाबेस_सोध्नुहोस्(\"SELECT * FROM मान\"))।",
        prints: None,
    },
    Recipe {
        title: "ask the local AI",
        keywords: &["ai", "ask", "question", "llm", "assistant", "model", "एआई", "सोध"],
        code: "भनौँ(एआई_सोध्नुहोस्(\"नेपालको राजधानी कहाँ हो?\"))।",
        prints: None,
    },
];

/// Indices of the `n` recipes most relevant to `question` (keyword hits,
/// ties keep table order); with no hits at all, the first `n`.
pub fn relevant_recipes(question: &str, n: usize) -> Vec<usize> {
    let q = question.to_lowercase();
    let mut scored: Vec<(usize, usize)> = RECIPES
        .iter()
        .enumerate()
        .map(|(i, r)| (i, r.keywords.iter().filter(|k| q.contains(*k)).count()))
        .collect();
    scored.sort_by(|a, b| b.1.cmp(&a.1).then(a.0.cmp(&b.0)));
    scored.into_iter().take(n).map(|(i, _)| i).collect()
}

const LANGUAGE_RULES: &str = "\
LANGUAGE (Nepali programming language, keywords in Devanagari or romanized; a statement may end with । or ;):
- राखौँ (rakha) makes a variable; भनौँ (bhana) prints; यदि/नत्र (yadi/natra) is if/else; भएसम्म (bhayesamma) is while; \
काम (kaam) defines a function; पठाउँ (pathau) returns; सहि/गलत/केहीछैन are true/false/null; र, वा, होइन are and, or, not.
- Arrays: [1, 2, 3], सूची[0]; लम्बाइ(x) length; थप्नुहोस्(सूची, v) appends.
- Builtins: आदेश_चलाउनुहोस्(prog, [args]) runs a command and returns [exit code, stdout, stderr]; files: ओएस_पढ्नुहोस्(path), \
ओएस_लेख्नुहोस्(path, text); डाटाबेस_चलाउनुहोस्/डाटाबेस_सोध्नुहोस् SQLite; क्यास_राख्नुहोस्/क्यास_ल्याउनुहोस् cache; \
एआई_सोध्नुहोस्(q) asks the local AI; पाइथन_चलाउनुहोस्, जेएस_चलाउनुहोस् run Python/JavaScript.
Working programs:
";

const OS_FACTS: &str = "\
OPERATING SYSTEM: Nepali OS is real Debian Linux whose login shell is the Nepali language itself. At its prompt \
you can type Nepali code, or any Linux command (ls, cat, ...). Typing `? question`, `ask question`, or just a sentence ending in ? asks the AI, `गर्नुहोस् goal` \
lets the AI agent act, `किन` explains the last error, `जानुहोस्` is cd, `बाहिर` exits. Alt+Shift switches the keyboard \
between English and Nepali. Services: nepali-fileserver (HTTP, port 8080), nepali-dnsserver (UDP 53), redis-server, \
SQLite database at $NEPALI_DB. The AI (LLM, Whisper speech-to-text, SpeechT5 text-to-speech) runs locally, offline.";

/// Language rules plus the `n` recipes most relevant to `question`.
pub fn language_guide_for(question: &str, n: usize) -> String {
    let mut s = String::from(LANGUAGE_RULES);
    for i in relevant_recipes(question, n) {
        let r = &RECIPES[i];
        s.push_str(&format!("Example ({}):\n{}\n", r.title, r.code));
        if let Some(p) = r.prints {
            s.push_str(&format!("(prints: {})\n", p.replace('\n', " / ")));
        }
        s.push('\n');
    }
    s
}

/// Whether a goal is about writing/running code (then the agent's prompt
/// includes the language guide; otherwise it stays short - a small model
/// gets measurably worse at picking tools when the prompt is padded).
pub fn looks_like_code_task(goal: &str) -> bool {
    let g = goal.to_lowercase();
    ["code", "program", "script", "compute", "calculate", "कोड", "कार्यक्रम"]
        .iter()
        .any(|k| g.contains(k))
}

pub fn os_facts() -> &'static str {
    OS_FACTS
}

/// System prompt for a grounded, one-shot answer (`सहायक_सोध्नुहोस्`, `? ...`).
pub fn assistant_system_prompt(question: &str, snapshot: &str) -> String {
    format!(
        "You are the built-in assistant of Nepali OS and its Nepali programming language. \
         Answer briefly and concretely, using only the facts below. When asked to write code, \
         write it in the Nepali language shown below, as ONE short program, then stop. Do not repeat yourself. If the user writes in Nepali, answer in Nepali.\n\n\
         {}\n{}\n{}",
        language_guide_for(question, 2),
        OS_FACTS,
        snapshot
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::interpreter::Interpreter;
    use crate::parser::Parser;
    use crate::resolver::Resolver;
    use alloc::string::ToString;

    #[test]
    fn every_recipe_parses_and_resolves_and_runnable_ones_print_what_the_guide_claims() {
        for r in RECIPES {
            let program = Parser::new(r.code)
                .parse_program()
                .unwrap_or_else(|e| panic!("recipe '{}' does not parse: {e}", r.title));
            Resolver::resolve(&program)
                .unwrap_or_else(|e| panic!("recipe '{}' does not resolve: {e:?}", r.title));
            if let Some(expected) = r.prints {
                let mut interp = Interpreter::new();
                interp
                    .run(&program)
                    .unwrap_or_else(|e| panic!("recipe '{}' fails: {e}", r.title));
                assert_eq!(interp.output.join("\n"), expected.to_string(), "recipe '{}'", r.title);
            }
        }
    }

    #[test]
    fn the_command_recipe_really_works_against_a_command_backend() {
        struct Echo;
        impl crate::interpreter::HostCommand for Echo {
            fn run(&self, p: &str, a: &[String]) -> Result<(i32, String, String), String> {
                Ok((0, format!("{p} {}", a.join(" ")), String::new()))
            }
        }
        let recipe = RECIPES.iter().find(|r| r.title.starts_with("run a Linux command")).unwrap();
        let program = Parser::new(recipe.code).parse_program().unwrap();
        let mut interp = Interpreter::new();
        interp.set_host_command(alloc::rc::Rc::new(Echo));
        interp.run(&program).unwrap();
        assert_eq!(interp.output, alloc::vec!["ls /tmp".to_string()]);
    }

    #[test]
    fn code_tasks_are_recognised() {
        assert!(looks_like_code_task("write a Nepali program that adds numbers"));
        assert!(looks_like_code_task("compute 6 factorial"));
        assert!(!looks_like_code_task("run whoami and tell me what it prints"));
    }

    #[test]
    fn command_recipe_passes_its_arguments_the_way_the_builtin_expects() {
        use crate::interpreter::HostCommand;
        use alloc::rc::Rc;
        use alloc::vec;
        use core::cell::RefCell;

        struct Recorder(RefCell<Vec<(String, Vec<String>)>>);
        impl HostCommand for Recorder {
            fn run(&self, program: &str, args: &[String]) -> Result<(i32, String, String), String> {
                self.0.borrow_mut().push((program.to_string(), args.to_vec()));
                Ok((0, "ok".to_string(), String::new()))
            }
        }

        let recipe = RECIPES.iter().find(|r| r.title.starts_with("run a Linux command")).unwrap();
        let program = Parser::new(recipe.code).parse_program().unwrap();
        let rec = Rc::new(Recorder(RefCell::new(Vec::new())));
        let mut interp = Interpreter::new();
        interp.set_host_command(rec.clone());
        interp.run(&program).expect("command recipe must run");
        assert_eq!(rec.0.borrow().as_slice(), &[("ls".to_string(), vec!["/tmp".to_string()])]);
        assert_eq!(interp.output, vec!["ok".to_string()]);
    }

    #[test]
    fn retrieval_picks_the_recipe_that_matches_the_question() {
        let top = |q: &str| RECIPES[relevant_recipes(q, 1)[0]].title;
        assert_eq!(top("write a loop that counts to 3"), "loop: print numbers 1 to 3");
        assert_eq!(top("how do I compute a factorial"), "factorial (recursion)");
        assert_eq!(top("save rows in a database table"), "SQLite database");
        assert_eq!(top("फाइल पढ्ने तरिका"), "read a file");
        assert_eq!(relevant_recipes("zzz qqq", 2), alloc::vec![0, 1]);
    }

    #[test]
    fn guide_names_only_builtins_that_exist() {
        for name in [
            "आदेश_चलाउनुहोस्",
            "ओएस_पढ्नुहोस्",
            "ओएस_लेख्नुहोस्",
            "डाटाबेस_चलाउनुहोस्",
            "डाटाबेस_सोध्नुहोस्",
            "क्यास_राख्नुहोस्",
            "क्यास_ल्याउनुहोस्",
            "एआई_सोध्नुहोस्",
            "पाइथन_चलाउनुहोस्",
            "जेएस_चलाउनुहोस्",
            "लम्बाइ",
            "थप्नुहोस्",
        ] {
            assert!(crate::interpreter::is_builtin(name), "{name} is not a builtin");
            assert!(
                RECIPES.iter().any(|r| r.code.contains(name)) || LANGUAGE_RULES.contains(name),
                "{name} missing from the guide"
            );
        }
    }
}
