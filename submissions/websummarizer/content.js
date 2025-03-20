document.addEventListener("DOMContentLoaded", async () => {
    async function generateResponse(userMessage) {
        const apiKey = "BEARER 7ciaxvObjwRoJu8wW2jzg9S0f9pCpuXksaZrMCrj"; // Replace with your actual API key
        try {
            const response = await fetch("https://api.cohere.com/v2/chat", {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    Authorization: `Bearer 7ciaxvObjwRoJu8wW2jzg9S0f9pCpuXksaZrMCrj`,
                },
                body: JSON.stringify({
                    max_tokens: 300, // Increase max_tokens for longer summaries
                    model: "command-r",
                    messages: [
                        {
                            role: "system",
                            content: "You are a helpful assistant. Summarize the following text in a concise and meaningful way.",
                        },
                        { role: "user", content: userMessage },
                    ],
                }),
            });

            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
                console.log(response)
            }

            const data = await response.json();
            return data.message.content[0].text // Return the last message content (summary)
        } catch (error) {
            console.error("Error generating response:", error);
            return "Error generating summary.";
        }
    }

    // Function to extract all text from the webpage
    function extractAllText() {
        const bodyText = document.body.innerText; // Get all text content from the body
        return bodyText.trim(); // Remove leading/trailing whitespace
    }

    async function highlightKeySentences() {
        const fullText = extractAllText(); // Extract all text from the webpage
        console.log("Extracted Text:", fullText); // Debugging: Log the extracted text

        if (!fullText) {
            console.error("No text found on the page.");
            return;
        }

        let summary = await generateResponse(fullText); // Send the entire webpage text to the AI
        console.log("Summary:", summary); // Debugging: Log the summary

        // Highlight paragraphs that contain parts of the summary
        let paragraphs = document.querySelectorAll("p");
        paragraphs.forEach(p => {
            if (summary.includes(p.innerText)) {
                p.style.backgroundColor = "yellow";
                p.style.fontWeight = "bold";
            }
        });

        // Create and display the summary box
        let summaryBox = document.createElement("div");
        summaryBox.style.position = "fixed";
        summaryBox.style.top = "10px";
        summaryBox.style.right = "10px";
        summaryBox.style.backgroundColor = "#fff";
        summaryBox.style.padding = "10px";
        summaryBox.style.border = "1px solid #000";
        summaryBox.style.zIndex = "1000";
        summaryBox.style.maxWidth = "400px";
        summaryBox.style.overflowY = "auto";
        summaryBox.style.maxHeight = "80vh";
        summaryBox.innerText = "Summary:\n" + summary;
        document.body.appendChild(summaryBox);
    }

    highlightKeySentences();
});