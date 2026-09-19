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
