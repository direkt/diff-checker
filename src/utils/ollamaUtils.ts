interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

interface OllamaError {
  error: string;
}

export class OllamaAPI {
  private _baseUrl: string;
  private model: string;

  constructor(baseUrl: string = 'http://localhost:11434', model: string = 'llama2') {
    this._baseUrl = baseUrl;
    this.model = model;
  }
  
  // Getter and setter for baseUrl
  get baseUrl(): string {
    return this._baseUrl;
  }
  
  set baseUrl(url: string) {
    this._baseUrl = url;
  }

  private async makeRequest(endpoint: string, data: any): Promise<OllamaResponse> {
    try {
      const response = await fetch(`${this._baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error: OllamaError = await response.json();
        throw new Error(error.error || 'Failed to make request to Ollama API');
      }

      return await response.json();
    } catch (error) {
      console.error('Error making request to Ollama:', error);
      throw error;
    }
  }

  async analyzeProfile(profile: any, question: string): Promise<string> {
    const prompt = `
      Analyze the following JSON profile and answer the question.
      
      Profile:
      ${JSON.stringify(profile, null, 2)}
      
      Question: ${question}
      
      Please provide a clear and concise answer based on the profile data.
    `;

    const response = await this.makeRequest('/api/generate', {
      model: this.model,
      prompt,
      stream: false,
    });

    return response.response;
  }

  async compareProfiles(profile1: any, profile2: any, question: string): Promise<string> {
    const prompt = `
      Compare the following two JSON profiles and answer the question.
      
      Profile 1:
      ${JSON.stringify(profile1, null, 2)}
      
      Profile 2:
      ${JSON.stringify(profile2, null, 2)}
      
      Question: ${question}
      
      Please provide a clear and concise answer based on the comparison of both profiles.
    `;

    const response = await this.makeRequest('/api/generate', {
      model: this.model,
      prompt,
      stream: false,
    });

    return response.response;
  }
}

// Create a singleton instance
export const ollamaAPI = new OllamaAPI(); 