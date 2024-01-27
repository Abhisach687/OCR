// Load the PDF
pdfjsLib.getDocument("GDP.pdf").promise.then((pdf) => {
  pdf.getPage(1).then((page) => {
    const scale = 1.5;
    const viewport = page.getViewport({ scale });

    // Prepare canvas using PDF page dimensions
    const canvas = document.getElementById("canvas");
    const context = canvas.getContext("2d");
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    // Render PDF page into canvas context
    const renderContext = {
      canvasContext: context,
      viewport,
    };
    page.render(renderContext);

    // Create parent bounding box
    const parentBox = document.createElement("div");
    parentBox.classList.add("bounding-box-parent");
    parentBox.style.position = "absolute";
    parentBox.style.border = "2px solid red";
    parentBox.style.width = "200px";
    parentBox.style.height = "200px";
    parentBox.style.left = "100px";
    parentBox.style.top = "100px";
    canvas.parentNode.appendChild(parentBox);

    // Create child bounding box
    const childBox = document.createElement("div");
    childBox.classList.add("bounding-box-child");
    childBox.style.position = "absolute";
    childBox.style.border = "2px solid blue";
    childBox.style.width = "100px";
    childBox.style.height = "100px";
    childBox.style.left = "50px";
    childBox.style.top = "50px";
    parentBox.appendChild(childBox);

    const dragMoveListener = (event) => {
      const target = event.target;
      const x = (parseFloat(target.getAttribute("data-x")) || 0) + event.dx;
      const y = (parseFloat(target.getAttribute("data-y")) || 0) + event.dy;

      target.style.transform = `translate(${x}px, ${y}px)`;

      target.setAttribute("data-x", x);
      target.setAttribute("data-y", y);
    };

    const resizeMoveListener = (event) => {
      const target = event.target;
      let x = parseFloat(target.getAttribute("data-x")) || 0;
      let y = parseFloat(target.getAttribute("data-y")) || 0;

      target.style.width = `${event.rect.width}px`;
      target.style.height = `${event.rect.height}px`;

      x += event.deltaRect.left;
      y += event.deltaRect.top;

      target.style.transform = `translate(${x}px, ${y}px)`;

      target.setAttribute("data-x", x);
      target.setAttribute("data-y", y);
    };

    // Make parent bounding box draggable and resizable
    interact(parentBox)
      .draggable({
        inertia: true,
        restrict: {
          restriction: "parent",
          endOnly: true,
          elementRect: { top: 0, left: 0, bottom: 1, right: 1 },
        },
        onmove: dragMoveListener,
      })
      .resizable({
        edges: { left: true, right: true, bottom: true, top: true },
      })
      .on("resizemove", resizeMoveListener);

    // Make child bounding box draggable and resizable
    interact(childBox)
      .draggable({
        inertia: true,
        restrict: {
          restriction: "parent",
          endOnly: true,
          elementRect: { top: 0, left: 0, bottom: 1, right: 1 },
        },
        onmove: dragMoveListener,
      })
      .resizable({
        edges: { left: true, right: true, bottom: true, top: true },
      })
      .on("resizemove", resizeMoveListener);

    // Perform OCR on submit
    document.getElementById("submit").addEventListener("click", () => {
      const childBox = document.querySelector(".bounding-box-child");

      // Get the cropped image
      const croppedImage = getCroppedImage(childBox);

      // Log the cropped image
      console.log("Cropped image:", croppedImage);

      // Perform OCR on the cropped image
      Tesseract.recognize(croppedImage, "eng", {
        logger: (m) => console.log(m),
      })
        .then((result) => {
          // Log the result
          console.log("OCR result:", result);

          if (result && result.text) {
            console.log(result.text);
          } else {
            console.error("Error during OCR: No text found");
          }
        })
        .catch((error) => {
          console.error("Error during OCR:", error);
        });
    });
  });
});

// Get the cropped image
function getCroppedImage(box) {
  const canvas = document.getElementById("canvas");
  const context = canvas.getContext("2d");

  // Use getBoundingClientRect to get the current position and size of the box
  const rect = box.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();

  const x = rect.left - canvasRect.left;
  const y = rect.top - canvasRect.top;
  const width = rect.width;
  const height = rect.height;

  // Check if there is an image or picture inside the bounding box
  const imageData = context.getImageData(x, y, width, height);
  const pixels = imageData.data;
  let hasImage = false;

  // Iterate through the pixels to check if there is any non-transparent pixel
  for (let i = 0; i < pixels.length; i += 4) {
    const alpha = pixels[i + 3];
    if (alpha !== 0) {
      hasImage = true;
      break;
    }
  }

  // If there is an image, crop the image based on the current position and size of the box
  if (hasImage) {
    const croppedImage = context.getImageData(x, y, width, height);
    return croppedImage;
  } else {
    console.log("No image found inside the bounding box");
    return null;
  }
}
