// CORS Proxy for Ollama API access
class CORSProxy {
  private proxyUrls = [
    'https://corsproxy.io/?',
    'https://cors-anywhere.herokuapp.com/',
    'https://api.allorigins.win/raw?url='
  ];

  private currentProxyIndex = 0;

  async makeRequest(url: string, options: RequestInit = {}): Promise<Response> {
    // First try direct connection (in case CORS is properly configured)
    try {
      console.log('Trying direct connection to:', url);
      const response = await fetch(url, {
        ...options,
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...options.headers
        }
      });
      
      if (response.ok) {
        console.log('Direct connection successful');
        return response;
      }
    } catch (error) {
      console.log('Direct connection failed, trying proxy:', error);
    }

    // If direct fails, try proxy methods
    for (let i = 0; i < this.proxyUrls.length; i++) {
      const proxyUrl = this.proxyUrls[(this.currentProxyIndex + i) % this.proxyUrls.length];
      
      try {
        console.log(`Trying proxy ${i + 1}:`, proxyUrl);
        
        let proxiedUrl: string;
        let requestOptions: RequestInit = { ...options };

        if (proxyUrl.includes('allorigins.win')) {
          // AllOrigins proxy requires different format
          proxiedUrl = `${proxyUrl}${encodeURIComponent(url)}`;
          requestOptions.method = 'GET'; // AllOrigins only supports GET
        } else {
          proxiedUrl = `${proxyUrl}${url}`;
        }

        const response = await fetch(proxiedUrl, {
          ...requestOptions,
          mode: 'cors',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...requestOptions.headers
          }
        });

        if (response.ok) {
          console.log(`Proxy ${i + 1} successful`);
          this.currentProxyIndex = (this.currentProxyIndex + i) % this.proxyUrls.length;
          return response;
        }
      } catch (error) {
        console.log(`Proxy ${i + 1} failed:`, error);
      }
    }

    // If all proxies fail, try localhost alternatives
    const localhostAlternatives = [
      url.replace('localhost', '127.0.0.1'),
      url.replace('localhost', '0.0.0.0'),
      url.replace('http://', 'https://') // Try HTTPS
    ];

    for (const altUrl of localhostAlternatives) {
      if (altUrl !== url) {
        try {
          console.log('Trying localhost alternative:', altUrl);
          const response = await fetch(altUrl, {
            ...options,
            mode: 'cors',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              ...options.headers
            }
          });
          
          if (response.ok) {
            console.log('Localhost alternative successful');
            return response;
          }
        } catch (error) {
          console.log('Localhost alternative failed:', error);
        }
      }
    }

    throw new Error('All CORS proxy attempts failed. Please ensure Ollama is running and CORS is properly configured.');
  }

  // Test if any method works
  async testConnection(baseUrl: string): Promise<boolean> {
    const testEndpoints = [
      `${baseUrl}/api/version`,
      `${baseUrl}/api/tags`,
      `${baseUrl}/`
    ];

    for (const endpoint of testEndpoints) {
      try {
        const response = await this.makeRequest(endpoint, {
          method: 'GET',
          signal: AbortSignal.timeout(10000) // 10 second timeout
        });
        
        if (response.ok) {
          console.log('Connection test successful on:', endpoint);
          return true;
        }
      } catch (error) {
        console.log('Connection test failed for:', endpoint, error);
      }
    }

    return false;
  }
}

export const corsProxy = new CORSProxy();