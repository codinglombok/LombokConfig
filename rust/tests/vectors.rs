//! Executes every case of vectors/lombokconfig-vectors-v1.json (GP-11).
use lombokconfig::{call, parse_json, Value};

fn vector_text() -> String {
    let p = concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../vectors/lombokconfig-vectors-v1.json"
    );
    std::fs::read_to_string(p).expect("vectors file")
}

fn s(v: &Value) -> &str {
    v.as_str().expect("expected string")
}

#[test]
fn all_vectors_match() {
    let doc = parse_json(&vector_text()).expect("vectors parse");
    let groups = doc.get("groups").and_then(|g| g.as_arr()).expect("groups");
    let mut total = 0usize;
    let mut failures: Vec<String> = Vec::new();
    for g in groups {
        for k in g.get("cases").and_then(|c| c.as_arr()).expect("cases") {
            total += 1;
            let name = s(k.get("name").unwrap());
            let func = s(k.get("fn").unwrap());
            let args = k.get("args").and_then(|a| a.as_arr()).expect("args");
            let expect = k.get("expect").unwrap();
            let got = call(func, args);
            match (expect.get("error"), got) {
                (Some(code), Err(e)) => {
                    let want_path = expect.get("path").map(|p| s(p).to_string());
                    let want_line = expect
                        .get("line")
                        .and_then(|l| l.as_f64())
                        .map(|l| l as u32);
                    if e.code != s(code) || e.path != want_path || e.line != want_line {
                        failures.push(format!(
                            "{}: error {} {:?} {:?} != {} {:?} {:?}",
                            name,
                            e.code,
                            e.path,
                            e.line,
                            s(code),
                            want_path,
                            want_line
                        ));
                    }
                }
                (Some(code), Ok(r)) => failures.push(format!(
                    "{}: expected error {} but got {}",
                    name,
                    s(code),
                    r.to_json()
                )),
                (None, Err(e)) => failures.push(format!("{}: unexpected error {}", name, e)),
                (None, Ok(r)) => {
                    let want = expect.get("result").unwrap().to_json();
                    if r.to_json() != want {
                        failures.push(format!(
                            "{}:\n  got      {}\n  expected {}",
                            name,
                            r.to_json(),
                            want
                        ));
                    }
                }
            }
        }
    }
    assert!(total >= 100, "GP-11 needs >= 100 cases, ran {}", total);
    assert!(
        failures.is_empty(),
        "{} of {} failed:\n{}",
        failures.len(),
        total,
        failures.join("\n")
    );
    println!("vectors executed: {}", total);
}

#[test]
fn malformed_json_is_rejected_without_panic() {
    for bad in [
        "",
        "{",
        "[1,]",
        "{\"a\":}",
        "\"\\ud800\"",
        "01",
        "1.",
        "nul",
        "{} x",
    ] {
        assert!(parse_json(bad).is_err(), "input {:?}", bad);
    }
    let deep = format!("{}1{}", "[".repeat(5000), "]".repeat(5000));
    assert!(parse_json(&deep).is_err());
}

#[test]
fn js_number_formatting() {
    for (n, t) in [
        (1.0, "1"),
        (0.5, "0.5"),
        (-3.0, "-3"),
        (1e21, "1e+21"),
        (1e20, "100000000000000000000"),
        (1e-7, "1e-7"),
        (0.000001, "0.000001"),
        (123456789012.0, "123456789012"),
        (-0.0, "0"),
        (1.5e300, "1.5e+300"),
        (5e-324, "5e-324"),
        (0.1 + 0.2, "0.30000000000000004"),
    ] {
        assert_eq!(Value::Num(n).to_json(), t);
    }
}

#[test]
fn readme_rust_example() {
    use lombokconfig::{parse_dotenv, resolve};
    let env = parse_dotenv("DB_HOST=db.example.com\nDB_PORT=6543\n", None).unwrap();
    let schema = parse_json(r#"{"db":{"host":{"type":"string","env":"DB_HOST"},"port":{"type":"int","env":"DB_PORT","default":5432}}}"#).unwrap();
    let config = resolve(&schema, Some(&env)).unwrap();
    assert_eq!(
        config.to_json(),
        r#"{"db":{"host":"db.example.com","port":6543}}"#
    );
}

#[test]
fn large_inputs_stay_fast() {
    let mut text = String::new();
    for i in 0..100_000 {
        text.push_str(&format!("K{}=${{K{}}}x\n", i, i / 2));
    }
    let t = std::time::Instant::now();
    let env = lombokconfig::parse_dotenv(&text, None).unwrap();
    assert_eq!(env.as_obj().unwrap().len(), 100_000);
    let big = parse_json(&format!(
        "{{{}}}",
        (0..100_000)
            .map(|i| format!("\"k{}\":{}", i, i))
            .collect::<Vec<_>>()
            .join(",")
    ))
    .unwrap();
    lombokconfig::merge(&big, &big).unwrap();
    assert!(t.elapsed().as_secs() < 30, "took {:?}", t.elapsed());
}
