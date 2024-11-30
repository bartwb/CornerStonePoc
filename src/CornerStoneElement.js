import React from "react";
import ReactDOM from "react-dom/client";
import * as cornerstone from "cornerstone-core";
import * as cornerstoneMath from "cornerstone-math";
import * as cornerstoneTools from "cornerstone-tools";
import Hammer from "hammerjs";
import * as cornerstoneWebImageLoader from "cornerstone-web-image-loader";
import './styling/cornerstone.css';

// Set up external dependencies
cornerstoneTools.external.cornerstone = cornerstone;
cornerstoneTools.external.cornerstoneMath = cornerstoneMath;
cornerstoneWebImageLoader.external.cornerstone = cornerstone;
cornerstoneTools.external.Hammer = Hammer;

cornerstone.registerImageLoader("webpack", (imageId) => {
  console.log(`Custom loader invoked for: ${imageId}`);
  const relativePath = imageId.replace("webpack://", ""); // Remove the 'webpack://' prefix
  const absoluteUrl = `${window.location.origin}${relativePath}`; // Prepend the origin
  console.log(`Translated URL: ${absoluteUrl}`);

  // Load the image using cornerstoneWebImageLoader
  const image = cornerstoneWebImageLoader.loadImage(absoluteUrl);

  // Check if `image` is a Promise or an object
  if (image && typeof image.then === "function") {
    // Handle asynchronously if it's a Promise
    return image.then((loadedImage) => {
      console.log("Image loaded:", loadedImage);

      // Inject pixel spacing metadata
      loadedImage.rowPixelSpacing = 0.001;
      loadedImage.columnPixelSpacing = 0.001; 
      return loadedImage;
    });
  } else {
    // If it's not a Promise, inject metadata directly
    image.rowPixelSpacing = 0.001; 
    image.columnPixelSpacing = 0.001; 

    return image;
  }
});


class CornerstoneElement extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      stack: props.stack,
      activeTool: "Pan", // Default active tool
      annotations: [], // Store all annotations
    };
  }

  render() {
    return (

        <div className="outerWrapper">
        <div>
        {/* Toolbar */}
        <div className="toolbar">
          {[
            "wwwc",
            "pan",
            "zoom",
            "length",
            "probe",
            "ellipticalRoi",
            "rectangleRoi",
          ].map((tool) => (
            <button
              key={tool}
              onClick={() => this.enableTool(tool, 1)}
              className={this.state.activeTool === tool ? "active" : ""}
            >
              {tool}
            </button>
          ))}
        </div>
      
        {/* Viewer */}
        <div className="viewportElement" ref={(input) => (this.dicomImage = input)}>
          <canvas className="cornerstone-canvas" />
          <div id="topLeftOverlay" className="overlay">
            BMW I3
          </div>
          <div id="topRightOverlay" className="overlay">
            INNER
          </div>
          <div id="bottomRightOverlay" className="overlay">
            Zoom:
          </div>
          <div id="bottomLeftOverlay" className="overlay">
            WW/WC:
          </div>
        </div>
       </div>

             {/* Markings List Section */}
             <div className="markings">
             <h3>Markings</h3>
             <ul>
               {this.state.annotations.map((annotation, index) => (
                 <li key={index}>
                   {annotation.toolType} - Note: {JSON.stringify(annotation.note)}
                   <button onClick={() => this.deleteAnnotation(index)}>Delete</button>
                 </li>
               ))}
             </ul>
           </div>

           </div>
    );
  }

  componentDidMount() {
    const element = this.dicomImage;

    // Enable the DOM Element for use with Cornerstone
    cornerstone.enable(element);

    // Load the image
    cornerstone.loadImage(this.props.stack.imageIds[0]).then((image) => {

      // Set spacing here as fallback
      image.rowPixelSpacing = 1.0; 
      image.columnPixelSpacing = 1.0;

      cornerstone.displayImage(element, image);

      // Set the initial viewport with a scale of 1
        const viewport = cornerstone.getDefaultViewportForImage(element, image);
        viewport.scale = 1; // Set zoom to 1
        cornerstone.setViewport(element, viewport);

      // Add event listener for rendering updates
      element.addEventListener("cornerstoneimagerendered", this.onImageRendered);

      // Enable inputs and tools
      cornerstoneTools.mouseInput.enable(element);
      cornerstoneTools.mouseWheelInput.enable(element);

      cornerstoneTools.pan.activate(element, 2); // Middle mouse button
      cornerstoneTools.zoom.activate(element, 4); // Right mouse button
      cornerstoneTools.zoomWheel.activate(element); // Mouse wheel

      cornerstoneTools.wwwc.enable(element);
      cornerstoneTools.pan.enable(element);
      cornerstoneTools.zoom.enable(element);
      cornerstoneTools.probe.enable(element);
      cornerstoneTools.length.enable(element);
      cornerstoneTools.ellipticalRoi.enable(element);
      cornerstoneTools.rectangleRoi.enable(element);
      cornerstoneTools.angle.enable(element);

      this.enableTool("pan", 1); // Default tool

      element.addEventListener("cornerstonetoolsmouseclick", this.updateAnnotations);
      
      element.addEventListener("cornerstonetoolsmeasurementadded", (event) => {
        console.log("Measurement added event triggered:", event);
      });

    //   element.addEventListener("cornerstonetoolsmeasurementmodified", (event) => {
    //     console.log("Measurement modified event triggered:", event);
    //   });

      element.addEventListener("cornerstonemeasurementcompleted", (event) => {
        console.log("Measurement completed event triggered:", event);
      });
    });
  }

  componentWillUnmount() {
    const element = this.dicomImage;
    cornerstone.disable(element);
    element.removeEventListener("cornerstonetoolsmouseclick", this.updateAnnotations);
  }

  onImageRendered = (event) => {

    const viewport = cornerstone.getViewport(event.target);

    // Update overlays with dynamic data
    document.getElementById("bottomLeftOverlay").textContent = `WW/WC: ${Math.round(
      viewport.voi.windowWidth
    )}/${Math.round(viewport.voi.windowCenter)}`;
    document.getElementById("bottomRightOverlay").textContent = `Zoom: ${viewport.scale.toFixed(2)}`;
  };

  enableTool = (toolName, mouseButtonNumber) => {
    this.disableAllTools();
    cornerstoneTools[toolName].activate(this.dicomImage, mouseButtonNumber);
    this.setState({ activeTool: toolName });
  };

  disableAllTools = () => {
    const element = this.dicomImage;

    cornerstoneTools.wwwc.disable(element);
    cornerstoneTools.pan.activate(element, 2); // Middle mouse button
    cornerstoneTools.zoom.activate(element, 4); // Right mouse button
    cornerstoneTools.probe.deactivate(element, 1);
    cornerstoneTools.length.deactivate(element, 1);
    cornerstoneTools.ellipticalRoi.deactivate(element, 1);
    cornerstoneTools.rectangleRoi.deactivate(element, 1);
    cornerstoneTools.highlight.deactivate(element, 1);
    cornerstoneTools.freehand?.deactivate(element, 1); // Optional for Freehand if available
  };

  updateAnnotations = (event) => {
    const toolState =
      cornerstoneTools.globalImageIdSpecificToolStateManager.saveToolState();
    const imageId = cornerstone.getImage(this.dicomImage).imageId;
    const annotations = toolState[imageId] || {};

    // Get all annotations from the tool state
    const formattedAnnotations = Object.keys(annotations).flatMap((toolType) =>
      annotations[toolType].data.map((data) => ({
        toolType,
        data,
        note: "", // Initialize with an empty note
      }))
    );

    // Check for new annotations
    const newAnnotations = formattedAnnotations.filter(
      (annotation) =>
        !this.state.annotations.some(
          (existing) =>
            JSON.stringify(existing.data) === JSON.stringify(annotation.data)
        )
    );

    // If there's a new annotation, add it to the state
    if (newAnnotations.length > 0) {
      const updatedAnnotations = [
        ...this.state.annotations,
        ...newAnnotations,
      ];

      this.setState({ annotations: updatedAnnotations }, () => {
        // Prompt for a note for the latest annotation
        newAnnotations.forEach((annotation, index) => {
          const annotationIndex =
            this.state.annotations.length - newAnnotations.length + index;
          const note = prompt(
            `Add a note for your new ${annotation.toolType} measurement:`
          );

          this.updateAnnotationNote(annotationIndex, note || "");
        });
      });
    }
  };

  updateAnnotationNote = (index, note) => {
    this.setState((prevState) => {
        const updatedAnnotations = [...prevState.annotations];
        updatedAnnotations[index].note = note;
        return { annotations: updatedAnnotations };
    });
};

  deleteAnnotation = (index) => {
    const updatedAnnotations = [...this.state.annotations];
    updatedAnnotations.splice(index, 1);

    this.setState({ annotations: updatedAnnotations }, () => {
      const imageId = cornerstone.getImage(this.dicomImage).imageId;
      const toolState = cornerstoneTools.globalImageIdSpecificToolStateManager.saveToolState();

      const filteredToolState = Object.keys(toolState[imageId]).reduce((acc, toolType) => {
        acc[toolType] = {
          data: toolState[imageId][toolType].data.filter(
            (_, dataIndex) => !(dataIndex === index)
          ),
        };
        return acc;
      }, {});

      cornerstoneTools.globalImageIdSpecificToolStateManager.restoreToolState({
        [imageId]: filteredToolState,
      });

      cornerstone.updateImage(this.dicomImage);
    });
  };

}

export default CornerstoneElement;
