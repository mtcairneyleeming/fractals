echo "Updating fractals project"
git pull

cd ./server
cargo build --release
cd ../web
parcel build web/*.html
cd ../
systemctl restart caddy.service
systemctl restart rust-fractals.service 
echo "Done."
