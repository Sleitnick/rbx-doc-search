echo "Packaging..."

if [ -f extension_build.zip ]; then
	rm extension_build.zip
fi

echo "Zipping extension"
cd extension
zip -r ../extension_build.zip *
cd ..

echo "Packaging complete"
