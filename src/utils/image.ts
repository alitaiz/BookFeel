/**
 * Resizes an image file to a maximum dimension while maintaining aspect ratio,
 * and compresses it to a JPEG format.
 * @param file The original image file.
 * @param maxDimension The maximum width or height of the resized image.
 * @returns A promise that resolves with the new, resized image File object.
 */
export const resizeImage = (file: File, maxDimension: number): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      if (!event.target?.result) {
        return reject(new Error("Couldn't read file for resizing."));
      }
      img.src = event.target.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > height) {
          if (width > maxDimension) {
            height *= maxDimension / width;
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width *= maxDimension / height;
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Could not get canvas context'));
        }
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return reject(new Error('Canvas toBlob failed'));
            }
            // Create a new name, ensuring it ends with .jpg for consistency
            const newFileName = file.name.split('.').slice(0, -1).join('.') + '.jpg';
            const newFile = new File([blob], newFileName, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(newFile);
          },
          'image/jpeg',
          0.8 // 80% quality
        );
      };
      img.onerror = (err) => reject(new Error(`Image load error: ${String(err)}`));
    };
    reader.onerror = (err) => reject(new Error(`File reader error: ${String(err)}`));
  });
};
