echo "Updating fractals project"
git pull

cd ./server
cargo build --release
cd ../web
yarn install
parcel build web/*.html
cd ../
systemctl restart caddy.service
systemctl restart rust-fractals.service 
echo "Done."
