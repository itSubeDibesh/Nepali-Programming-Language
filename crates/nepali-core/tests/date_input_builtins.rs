use nepali_core::{
    day_of_week_name, days_in_month, days_to_ymd,
    is_leap_year, is_valid_date, parse_date_str, ymd_to_days,
    HostClock, HostInput, Interpreter,
};
use std::cell::RefCell;
use std::rc::Rc;

#[test]
fn test_date_utilities() {
    assert!(is_leap_year(2000));
    assert!(is_leap_year(2024));
    assert!(!is_leap_year(1900));
    assert!(!is_leap_year(2026));

    assert_eq!(days_in_month(2024, 2), 29);
    assert_eq!(days_in_month(2026, 2), 28);
    assert_eq!(days_in_month(2026, 8), 31);
    assert_eq!(days_in_month(2026, 9), 30);

    assert!(is_valid_date(2026, 9, 19));
    assert!(!is_valid_date(2026, 2, 30));
    assert!(!is_valid_date(2026, 13, 1));
    assert!(!is_valid_date(2026, 0, 1));

    let days = ymd_to_days(2026, 9, 19);
    assert_eq!(days_to_ymd(days), (2026, 9, 19));

    assert_eq!(day_of_week_name(2026, 9, 19), "शनिबार");
    assert_eq!(day_of_week_name(1970, 1, 1), "बिहीबार");
}

#[test]
fn test_parse_date_str_ascii_and_devanagari() {
    assert_eq!(parse_date_str("2026-09-19").unwrap(), (2026, 9, 19));
    assert_eq!(parse_date_str("2026/09/19").unwrap(), (2026, 9, 19));
    assert_eq!(parse_date_str("२०२६-०९-१९").unwrap(), (2026, 9, 19));
    assert_eq!(parse_date_str("२०००/०५/१४").unwrap(), (2000, 5, 14));

    assert!(parse_date_str("2026-02-30").is_err());
    assert!(parse_date_str("invalid").is_err());
}

struct MockClock(i32, u32, u32);
impl HostClock for MockClock {
    fn today(&self) -> Result<(i32, u32, u32), String> {
        Ok((self.0, self.1, self.2))
    }
}

struct MockInput(RefCell<Vec<String>>);
impl HostInput for MockInput {
    fn read_line(&self, _prompt: &str) -> Result<String, String> {
        if self.0.borrow().is_empty() {
            Ok(String::new())
        } else {
            Ok(self.0.borrow_mut().remove(0))
        }
    }
}

fn run_program_with_mocks(code: &str, clock: Option<MockClock>, input_lines: Vec<&str>) -> (Vec<String>, Result<(), String>) {
    let program = nepali_core::parser::Parser::new(code).parse_program().unwrap();
    let mut interp = Interpreter::new();
    if let Some(c) = clock {
        interp.set_host_clock(Rc::new(c));
    }
    if !input_lines.is_empty() {
        let lines: Vec<String> = input_lines.into_iter().map(String::from).collect();
        interp.set_host_input(Rc::new(MockInput(RefCell::new(lines))));
    }
    let res = interp.run(&program);
    (interp.output, res)
}

#[test]
fn test_aaja_and_din_farak_builtins() {
    let code = r#"
        राखौँ आजको = आज()।
        राखौँ मिति१ = "2026-01-01"।
        राखौँ मिति२ = "2026-09-19"।
        भनौँ(दिन_फरक(मिति२, मिति१))।
        भनौँ(हप्ताको_दिन(मिति२))।
    "#;
    let (output, res) = run_program_with_mocks(code, Some(MockClock(2026, 9, 19)), vec![]);
    res.expect("program should run");
    assert_eq!(output, vec!["261", "शनिबार"]);
}

#[test]
fn test_umer_builtin() {
    let code = r#"
        राखौँ जन्म१ = "2000-05-14"।
        राखौँ जन्म२ = "2000-10-15"।
        भनौँ("उमेर १:", उमेर(जन्म१))।
        भनौँ("उमेर २:", उमेर(जन्म२))।
    "#;
    let (output, res) = run_program_with_mocks(code, Some(MockClock(2026, 9, 19)), vec![]);
    res.expect("program should run");
    assert_eq!(output, vec!["उमेर १: 26", "उमेर २: 25"]);
}

#[test]
fn test_miti_banaunuhos_and_miti_padhnuhos() {
    let code = r#"
        राखौँ म = मिति_बनाउनुहोस्(2025, 12, 25)।
        राखौँ प = मिति_पढ्नुहोस्("२०२५-१२-२५")।
        भनौँ(म[0], म[1], म[2])।
        भनौँ(प[0], प[1], प[2])।
    "#;
    let (output, res) = run_program_with_mocks(code, None, vec![]);
    res.expect("program should run");
    assert_eq!(output, vec!["2025 12 25", "2025 12 25"]);
}

#[test]
fn test_input_builtin() {
    let code = r#"
        राखौँ नाम = इनपुट("नाम दिनुहोस्: ")।
        भनौँ("नमस्ते", नाम)।
    "#;
    let (output, res) = run_program_with_mocks(code, None, vec!["रमेश"]);
    res.expect("program should run");
    assert_eq!(output, vec!["नमस्ते रमेश"]);
}

#[test]
fn test_roman_builtin_aliases() {
    let code = r#"
        rakha a = aaja()।
        rakha d = din_farak("2026-09-19", "2026-09-09")।
        rakha u = umer("2000-01-01")।
        bhana(d, u)।
    "#;
    let (output, res) = run_program_with_mocks(code, Some(MockClock(2026, 9, 19)), vec![]);
    res.expect("program should run");
    assert_eq!(output, vec!["10 26"]);
}

#[test]
fn test_input_builtin_various_prompt_types() {
    // Test input with number prompt, bool prompt, array prompt, empty prompt, and multi-arg prompt
    let code = r#"
        राखौँ a = इनपुट()।
        राखौँ b = इनपुट(५)।
        राखौँ c = इनपुट(100)।
        राखौँ d = इनपुट(सहि)।
        राखौँ e = इनपुट("मान", २, ":")।
        भनौँ(a, b, c, d, e)।
    "#;
    let (output, res) = run_program_with_mocks(code, None, vec!["पहिलो", "दोस्रो", "तेस्रो", "चौथो", "पाँचौँ"]);
    res.expect("program should run with non-string and multi-arg prompts");
    assert_eq!(output, vec!["पहिलो दोस्रो तेस्रो चौथो पाँचौँ"]);
}

#[test]
fn test_sankhya_conversion_builtin() {
    let code = r#"
        राखौँ num_ascii = संख्या("123.45")।
        राखौँ num_dev = संख्या("१२३.४५")।
        राखौँ num_neg = संख्या(" -५०.५ ")।
        राखौँ num_bool1 = संख्या(सहि)।
        राखौँ num_bool2 = संख्या(गलत)।
        राखौँ num_null = संख्या(केहीछैन)।
        राखौँ num_raw = संख्या(42)।
        भनौँ(num_ascii, num_dev, num_neg, num_bool1, num_bool2, num_null, num_raw)।
    "#;
    let (output, res) = run_program_with_mocks(code, None, vec![]);
    res.expect("program should run");
    assert_eq!(output, vec!["123.45 123.45 -50.5 1 0 0 42"]);
}

#[test]
fn test_string_and_prakar_builtins() {
    let code = r#"
        राखौँ s1 = स्ट्रिङ(५००)।
        राखौँ s2 = स्ट्रिङ(सहि)।
        राखौँ s3 = स्ट्रिङ("मान:", [1, 2])।
        राखौँ t_num = प्रकार(10)।
        राखौँ t_str = प्रकार("hello")।
        राखौँ t_bool = प्रकार(गलत)।
        राखौँ t_null = प्रकार(शून्य)।
        राखौँ t_arr = प्रकार([1, 2])।
        भनौँ(s1, s2, s3)।
        भनौँ(t_num, t_str, t_bool, t_null, t_arr)।
    "#;
    let (output, res) = run_program_with_mocks(code, None, vec![]);
    res.expect("program should run");
    assert_eq!(output, vec!["500 सहि मान: [1, 2]", "संख्या स्ट्रिङ बुलियन शून्य सूची"]);
}

#[test]
fn test_input_combined_with_sankhya_arithmetic() {
    let code = r#"
        राखौँ उमेर_पाठ = इनपुट("उमेर: ")।
        राखौँ उमेर_संख्या = संख्या(उमेर_पाठ)।
        राखौँ अर्को_वर्ष = उमेर_संख्या + १।
        भनौँ("अर्को वर्ष उमेर:", अर्को_वर्ष)।
    "#;
    let (output, res) = run_program_with_mocks(code, None, vec!["२५"]);
    res.expect("program should run");
    assert_eq!(output, vec!["अर्को वर्ष उमेर: 26"]);
}
