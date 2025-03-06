import React, { useState, useEffect } from 'react';
import './App.css';

// Main App Component
function App() {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [prompts, setPrompts] = useState([]);
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [variables, setVariables] = useState({});
  const [generatedResponse, setGeneratedResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Replace with your actual n8n webhook URLs
  const N8N_CATEGORIES_URL = 'YOUR_N8N_CATEGORIES_ENDPOINT'; 
  const N8N_PROMPTS_URL = 'YOUR_N8N_PROMPTS_ENDPOINT';
  const N8N_GENERATE_URL = 'YOUR_N8N_GENERATE_ENDPOINT';
  const N8N_EMAIL_URL = 'YOUR_N8N_EMAIL_ENDPOINT';

  // Fetch categories on initial load
  useEffect(() => {
    fetchCategories();
  }, []);

  // Fetch prompts when category changes
  useEffect(() => {
    if (selectedCategory) {
      fetchPromptsByCategory(selectedCategory);
    }
  }, [selectedCategory]);

  // Extract variables when prompt changes
  useEffect(() => {
    if (selectedPrompt) {
      extractVariables(selectedPrompt.promptTemplate);
    }
  }, [selectedPrompt]);

  // Fetch all unique categories from the API
  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(N8N_CATEGORIES_URL);
      const data = await response.json();
      
      if (data.success) {
        setCategories(data.categories);
      } else {
        setError('Failed to fetch categories');
      }
    } catch (err) {
      setError('Error connecting to the server');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch prompts by category
  const fetchPromptsByCategory = async (category) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${N8N_PROMPTS_URL}?category=${category}`);
      const data = await response.json();
      
      if (data.success) {
        setPrompts(data.prompts);
        setSelectedPrompt(null);
        setVariables({});
        setGeneratedResponse('');
      } else {
        setError('Failed to fetch prompts');
      }
    } catch (err) {
      setError('Error connecting to the server');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Extract variables from prompt template
  const extractVariables = (template) => {
    const variableRegex = /\{\{(.*?)\}\}/g;
    const matches = [...template.matchAll(variableRegex)];
    const newVariables = {};
    
    matches.forEach(match => {
      const varName = match[1].trim();
      newVariables[varName] = '';
    });
    
    setVariables(newVariables);
  };

  // Handle variable input changes
  const handleVariableChange = (varName, value) => {
    setVariables(prev => ({
      ...prev,
      [varName]: value
    }));
  };

  // Generate response using the OpenAI API via n8n
  const generateResponse = async () => {
    // Check if all variables are filled
    const allFilled = Object.values(variables).every(val => val.trim() !== '');
    
    if (!allFilled) {
      setError('Please fill in all variables');
      return;
    }
    
    try {
      setIsLoading(true);
      setError('');
      
      // Replace variables in the prompt template
      let filledPrompt = selectedPrompt.promptTemplate;
      Object.entries(variables).forEach(([varName, value]) => {
        filledPrompt = filledPrompt.replace(new RegExp(`\\{\\{${varName}\\}\\}`, 'g'), value);
      });
      
      const response = await fetch(N8N_GENERATE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: filledPrompt,
          promptName: selectedPrompt.promptName
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setGeneratedResponse(data.response);
      } else {
        setError(data.error || 'Failed to generate response');
      }
    } catch (err) {
      setError('Error connecting to the server');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Copy response to clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedResponse)
      .then(() => {
        alert('Copied to clipboard!');
      })
      .catch(err => {
        setError('Failed to copy to clipboard');
        console.error(err);
      });
  };

  // Email response
  const emailResponse = async () => {
    const email = prompt('Enter your email address:');
    
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    
    try {
      setIsLoading(true);
      
      const response = await fetch(N8N_EMAIL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          subject: `AI Response: ${selectedPrompt.promptName}`,
          content: generatedResponse
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('Email sent successfully!');
      } else {
        setError(data.error || 'Failed to send email');
      }
    } catch (err) {
      setError('Error connecting to the server');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container">
      <header>
        <h1>Real Estate AI Prompt Generator</h1>
      </header>
      
      <main>
        {error && <div className="error-message">{error}</div>}
        
        <section className="selection-container">
          <div className="form-group">
            <label htmlFor="category-select">Select Category:</label>
            <select 
              id="category-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              disabled={isLoading || categories.length === 0}
            >
              <option value="">Select a category...</option>
              {categories.map((category, index) => (
                <option key={index} value={category}>{category}</option>
              ))}
            </select>
          </div>
          
          {selectedCategory && (
            <div className="form-group">
              <label htmlFor="prompt-select">Select Prompt:</label>
              <select
                id="prompt-select"
                value={selectedPrompt ? selectedPrompt.promptName : ''}
                onChange={(e) => {
                  const selected = prompts.find(p => p.promptName === e.target.value);
                  setSelectedPrompt(selected);
                }}
                disabled={isLoading || prompts.length === 0}
              >
                <option value="">Select a prompt...</option>
                {prompts.map((prompt, index) => (
                  <option key={index} value={prompt.promptName}>{prompt.promptName}</option>
                ))}
              </select>
            </div>
          )}
        </section>
        
        {selectedPrompt && Object.keys(variables).length > 0 && (
          <section className="variables-container">
            <h3>Fill in the Variables:</h3>
            {Object.keys(variables).map((varName) => (
              <div className="form-group" key={varName}>
                <label htmlFor={`var-${varName}`}>{varName}:</label>
                <input
                  id={`var-${varName}`}
                  type="text"
                  value={variables[varName]}
                  onChange={(e) => handleVariableChange(varName, e.target.value)}
                  disabled={isLoading}
                />
              </div>
            ))}
            
            <button 
              className="action-button generate"
              onClick={generateResponse}
              disabled={isLoading}
            >
              {isLoading ? 'Generating...' : 'Generate Response'}
            </button>
          </section>
        )}
        
        {generatedResponse && (
          <section className="response-container">
            <h3>Generated Response:</h3>
            <div className="response-content">
              {generatedResponse.split('\n').map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
            
            <div className="action-buttons">
              <button 
                className="action-button copy"
                onClick={copyToClipboard}
                disabled={isLoading}
              >
                Copy to Clipboard
              </button>
              <button 
                className="action-button email"
                onClick={emailResponse}
                disabled={isLoading}
              >
                Email Response
              </button>
            </div>
          </section>
        )}
      </main>
      
      <footer>
        <p>&copy; {new Date().getFullYear()} Real Estate AI Prompt Generator</p>
      </footer>
    </div>
  );
}

export default App;
