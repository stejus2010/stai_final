document.addEventListener('DOMContentLoaded', function() {
    const startButton = document.getElementById('start-button');
    const homeScreen = document.getElementById('home-screen');
    const scannerScreen = document.getElementById('scanner-screen');

    if (!startButton) {
        console.error("Start Button not found!");
    }

    startButton.addEventListener('click', () => {
        // Hide home screen and show scanner screen
        homeScreen.style.display = 'none';
        scannerScreen.style.display = 'block'; // Directly display the scanner screen
        startCamera(); // Initialize camera
    });


});

let cameraInput;
let capturedImage;
let extractedTextElement;
let harmfulIngredientsData = {}; // To store harmful ingredients data

// Load the harmful ingredients JSON data
fetch('ingredients.json')
    .then(response => response.json())
    .then(data => {
        harmfulIngredientsData = data.harmfulIngredients; // Store the harmful ingredients
    })
    .catch(error => {
        console.error("Error loading ingredients JSON:", error);
    });

function setup() {
    noCanvas(); // We don't need a canvas for the video feed
    extractedTextElement = document.getElementById('extracted-text');
}

function startCamera() {
    // Use constraints to access the back camera
    const constraints = {
        video: {
            facingMode: { exact: "user" } // Use back camera
        }
    };

    navigator.mediaDevices.getUserMedia(constraints)
        .then(function(stream) {
            cameraInput = createCapture(VIDEO);
            cameraInput.size(400, 300);
            cameraInput.parent('video-container'); // Attach video to a div in HTML
            cameraInput.elt.srcObject = stream; // Set the video stream

            // Move the event listener bindings for buttons inside this function
            const scanButton = document.getElementById('scan-button');
            const editButton = document.getElementById('edit-button');
            const saveButton = document.getElementById('save-button');

            if (scanButton) {
                scanButton.addEventListener('click', () => {
                    captureImage();
                });
            } else {
                console.error("Scan button not found!");
            }

            if (editButton) {
                editButton.addEventListener('click', () => {
                    enableEditing();
                });
            } else {
                console.error("Edit button not found!");
            }

            if (saveButton) {
                saveButton.addEventListener('click', () => {
                    saveChanges();
                });
            } else {
                console.error("Save button not found!");
            }
        })
        .catch(function(error) {
            console.error("Error accessing the camera:", error);
        });
}

function captureImage() {
    // Create a canvas to capture a frame from the video feed
    let captureCanvas = createGraphics(400, 300);
    captureCanvas.image(cameraInput, 0, 0, 400, 300);

    // Show the captured image
    let capturedImageDiv = document.getElementById('captured-image');
    capturedImageDiv.innerHTML = ''; // Clear previous image
    let imageElement = createImg(captureCanvas.canvas.toDataURL(), "Captured Image");
    capturedImageDiv.appendChild(imageElement.elt);

    // Perform text extraction
    extractTextFromImage(captureCanvas.canvas);
}

function extractTextFromImage(imageCanvas) {
    // Using Tesseract.js to extract text from the captured image
    Tesseract.recognize(imageCanvas, 'eng', { logger: m => console.log(m) })
        .then(result => {
            const extractedText = result.data.text;
            displayExtractedText(extractedText);
            checkHarmfulIngredients(extractedText); // Check for harmful ingredients
        })
        .catch(error => {
            console.error("Error during text extraction:", error);
        });
}

function displayExtractedText(text) {
    extractedTextElement.value = text; // Set the value of the textarea to the extracted text
}

function checkHarmfulIngredients(extractedText) {
    // Step 1: Clean and preprocess the extracted text
    const cleanedText = extractedText
        .toLowerCase() // Convert text to lowercase
        .replace(/[^\w\s]/g, '') // Remove punctuation
        .replace(/\s+/g, ' ') // Replace multiple spaces with a single space
        .trim(); // Trim leading/trailing spaces

    // Step 2: Split the cleaned text into individual words (ingredients)
    const words = cleanedText.split(' ');

    // Step 3: Filter out common words that are not ingredients
    const ignoredWords = new Set(['and', 'or', 'sugar', 'salt']);
    const filteredWords = words.filter(word => !ignoredWords.has(word));

    // Step 4: Map of synonyms or alternative names for ingredients
    const synonymMap = {
        'vitamin c': 'ascorbic acid',
        'e300': 'ascorbic acid',
        'e330': 'citric acid',
        // Add more synonyms or E-number mappings if needed
    };

    const foundDiseases = new Set(); // Use a Set to avoid duplicates

    // Step 5: Check for harmful ingredients and map synonyms
    filteredWords.forEach(word => {
        const ingredient = synonymMap[word] || word; // Use synonym if available
        if (harmfulIngredientsData[ingredient]) {
            const diseases = harmfulIngredientsData[ingredient].diseases;
            diseases.forEach(disease => foundDiseases.add(disease)); // Add diseases to the Set
        }
    });

    // Step 6: Display results using SweetAlert
    if (foundDiseases.size > 0) {
        swal({
            title: "Harmful ingredients detected!",
            text: "Potential diseases: " + Array.from(foundDiseases).join(", "),
            icon: "warning",
        });
    } else {
        swal({
            title: "No harmful ingredients detected",
            text: "You're safe!",
            icon: "success",
        });
    }
}

function enableEditing() {
    const textarea = document.getElementById('extracted-text');
    textarea.readOnly = false; // Make the textarea editable
    document.getElementById('edit-button').style.display = 'none'; // Hide edit button
    document.getElementById('save-button').style.display = 'inline'; // Show save button
}

function saveChanges() {
    const textarea = document.getElementById('extracted-text');
    const editedText = textarea.value; // Get the edited text

    // Save the edited text to local storage
    localStorage.setItem('editedExtractedText', editedText);

    textarea.readOnly = true; // Make the textarea non-editable
    document.getElementById('edit-button').style.display = 'inline'; // Show edit button again
    document.getElementById('save-button').style.display = 'none'; // Hide save button

    checkHarmfulIngredients(editedText); // Check for harmful ingredients in the edited text
}
