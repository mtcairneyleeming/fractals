echo "Updating fractals project"
git fetch

cd ./server
cargo build --release
cd ../web
parcel build web/*.html
cd ../
echo "Done."
