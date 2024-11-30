import React from "react";
import CornerstoneElement from "./CornerStoneElement";
import image from './assets/1.png';

// const imageId =
//   "https://rawgit.com/cornerstonejs/cornerstoneWebImageLoader/master/examples/Renal_Cell_Carcinoma.jpg";

const imageId = `webpack://${image}`;

const stack = {
  imageIds: [imageId],
  currentImageIdIndex: 0,
};

const App = () => (
  <div>
    <h2>Cornerstone POC</h2>
    <CornerstoneElement stack={{ ...stack }} />
  </div>
);

export default App;
