#[rocket::launch]
fn rocket() -> _ {
    let dir = server::static_dir();
    log::info!("Serving the frontend from {}", dir.display());
    server::build_rocket(dir)
}
