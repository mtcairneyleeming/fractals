//! Tests of the HTTP API with Rocket's local client, sending the bodies the frontend sends:
//! `@msgpack/msgpack`'s `encode([layers, [variantIndex, [fields...]]])`, i.e. plain arrays.
mod common;
use rocket::http::{ContentType, Status};
use rocket::local::blocking::Client;
use sha2::{Digest, Sha256};

fn client() -> (Client, tempdir::Dir) {
    let dir = tempdir::Dir::new();
    std::fs::write(dir.path().join("index.html"), "<!doctype html><title>fractals test</title>").unwrap();
    std::fs::write(dir.path().join("app.js"), "console.log(1)").unwrap();
    (Client::tracked(server::build_rocket(dir.path().to_path_buf())).unwrap(), dir)
}

/// Tiny temp directory helper (avoids another dev-dependency).
mod tempdir {
    use std::path::{Path, PathBuf};
    pub struct Dir(PathBuf);
    impl Dir {
        pub fn new() -> Dir {
            let n = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos();
            let p = std::env::temp_dir().join(format!("fractals-test-{}-{}", std::process::id(), n));
            std::fs::create_dir_all(&p).unwrap();
            Dir(p)
        }
        pub fn path(&self) -> &Path {
            &self.0
        }
    }
    impl Drop for Dir {
        fn drop(&mut self) {
            let _ = std::fs::remove_dir_all(&self.0);
        }
    }
}

/// The hole options in the frontend's wire format.
fn legacy_body(layers: &[Vec<[f64; 6]>], holes: &serde_json::Value) -> Vec<u8> {
    match holes {
        serde_json::Value::String(_) => rmp_serde::to_vec(&(layers, (0u32, Vec::<f64>::new()))).unwrap(),
        v if v.get("ParallelOnly").is_some() => {
            let f = v["ParallelOnly"]["frame_factor"].as_f64().unwrap();
            rmp_serde::to_vec(&(layers, (1u32, vec![f]))).unwrap()
        }
        v => {
            let e = &v["Everywhere"];
            let fields = (
                e["num_holes"].as_i64().unwrap(),
                e["ratio"].as_f64().unwrap(),
                e["scaling_factor"].as_i64().unwrap(),
                e["frame_factor"].as_f64().unwrap(),
            );
            rmp_serde::to_vec(&(layers, (2u32, fields))).unwrap()
        }
    }
}

fn query(q: &serde_json::Value) -> String {
    let mut parts = vec![];
    for (k, v) in q.as_object().unwrap() {
        if !v.is_null() {
            parts.push(format!("{k}={v}"));
        }
    }
    parts.join("&")
}

#[test]
fn stl_route_returns_the_golden_stl_for_every_fixture() {
    let (client, _dir) = client();
    let golden = common::golden();
    let raw: Vec<serde_json::Value> =
        serde_json::from_str(&std::fs::read_to_string(concat!(env!("CARGO_MANIFEST_DIR"), "/tests/fixtures/cases.json")).unwrap())
            .unwrap();
    for (case, raw) in common::cases().into_iter().zip(raw) {
        let body = legacy_body(&case.layers, &raw["holes"]);
        let url = format!("/api/stl?{}", query(&raw["q"]));
        let resp = client.post(url).header(ContentType::MsgPack).body(body).dispatch();
        assert_eq!(resp.status(), Status::Ok, "{}", case.name);
        assert_eq!(resp.content_type(), Some(ContentType::Binary), "{}", case.name);
        let stl = resp.into_bytes().unwrap();
        let (canon, _) = common::canonical_nans(&stl);
        assert_eq!(
            format!("{:x}", Sha256::digest(&canon)),
            golden[&case.name]["sha256_nan_canonical"].as_str().unwrap(),
            "{}",
            case.name
        );
    }
}

#[test]
fn stl_route_accepts_integer_coordinates_like_the_js_encoder_sends() {
    // JS encodes whole numbers as msgpack ints, not floats.
    let (client, _dir) = client();
    let layers: Vec<Vec<[i64; 6]>> = vec![
        vec![[0, 0, 0, 10, 0, 0], [10, 0, 0, 5, 8, 0], [5, 8, 0, 0, 0, 0]],
        vec![[0, 0, 4, 10, 0, 4], [10, 0, 4, 5, 8, 4], [5, 8, 4, 0, 0, 4]],
    ];
    let body = rmp_serde::to_vec(&(layers, (0u32, Vec::<f64>::new()))).unwrap();
    let resp = client
        .post("/api/stl?thicken=false&curve=false&extrude=false&init_steps=12&step_scale=1.0")
        .header(ContentType::MsgPack)
        .body(body)
        .dispatch();
    assert_eq!(resp.status(), Status::Ok);
    let stl = resp.into_bytes().unwrap();
    assert!(common::stl_summary(&stl).0 > 0);
    assert_eq!(stl.len(), 84 + 50 * common::stl_summary(&stl).0);
}

#[test]
fn stl_route_rejects_bad_requests() {
    let (client, _dir) = client();
    let body = rmp_serde::to_vec(&(Vec::<Vec<[f64; 6]>>::new(), (0u32, Vec::<f64>::new()))).unwrap();
    let ok_query = "thicken=false&init_steps=12&step_scale=1.0&extrude=false";
    // Wrong content type: the route's `format` makes it not match.
    let r = client.post(format!("/api/stl?{ok_query}")).header(ContentType::JSON).body(body.clone()).dispatch();
    assert_eq!(r.status(), Status::NotFound);
    // Missing required query parameter.
    let r = client.post("/api/stl?thicken=false").header(ContentType::MsgPack).body(body.clone()).dispatch();
    assert!(r.status() == Status::NotFound || r.status() == Status::UnprocessableEntity, "{}", r.status());
    // Garbage body.
    let r = client.post(format!("/api/stl?{ok_query}")).header(ContentType::MsgPack).body(vec![0xc1, 0xff]).dispatch();
    assert!(r.status().class().is_client_error(), "{}", r.status());
    // thicken=true without the thickness parameters.
    let r = client.post("/api/stl?thicken=true&init_steps=12&step_scale=1.0&extrude=false")
        .header(ContentType::MsgPack)
        .body(rmp_serde::to_vec(&(vec![vec![[0.0f64; 6]]], (0u32, Vec::<f64>::new()))).unwrap())
        .dispatch();
    assert_eq!(r.status(), Status::BadRequest);
    // GET on the API is not a route.
    assert_eq!(client.get("/api/stl").dispatch().status(), Status::NotFound);
}

#[test]
fn static_files_are_served_from_the_static_dir() {
    let (client, _dir) = client();
    let r = client.get("/").dispatch();
    assert_eq!(r.status(), Status::Ok);
    assert_eq!(r.content_type(), Some(ContentType::HTML));
    assert!(r.into_string().unwrap().contains("fractals test"));
    let r = client.get("/app.js").dispatch();
    assert_eq!(r.status(), Status::Ok);
    assert_eq!(client.get("/nope.css").dispatch().status(), Status::NotFound);
}
