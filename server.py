from flask import Flask, request, jsonify
import requests
import os
import time
import random

app = Flask(__name__)

# Configuración de modelos y proveedores
GEMINI_MODEL = os.environ.get('GEMINI_MODEL', 'gemini-2.0-flash')
CLAUDE_MODEL_NAME = 'claude-sonnet-4-5'

# Fallback providers para cuando Gemini falle
OPENROUTER_API_KEY = os.environ.get('OPENROUTER_API_KEY', '').strip()
GROQ_API_KEY = os.environ.get('GROQ_API_KEY', '').strip()


def claude_to_gemini(body):
    contents = []
    system_text = body.get('system', '')

    for msg in body.get('messages', []):
        role = 'user' if msg.get('role') == 'user' else 'model'
        content = msg.get('content', '')

        if isinstance(content, list):
            text = ' '.join(c.get('text', '') for c in content if c.get('type') == 'text')
        else:
            text = str(content)

        contents.append({'role': role, 'parts': [{'text': text}]})

    if system_text and contents:
        contents[0]['parts'].insert(0, {'text': f'[System: {system_text}]\n\n'})

    return {
        'contents': contents,
        'generationConfig': {
            'maxOutputTokens': body.get('max_tokens', 8192),
            'temperature': 0.7
        }
    }


def claude_to_openrouter(body):
    """Convierte formato Claude a OpenRouter (que usa formato OpenAI)"""
    messages = []
    
    if body.get('system'):
        messages.append({'role': 'system', 'content': body.get('system')})
    
    for msg in body.get('messages', []):
        role = msg.get('role')
        content = msg.get('content', '')
        
        if isinstance(content, list):
            text = ' '.join(c.get('text', '') for c in content if c.get('type') == 'text')
        else:
            text = str(content)
            
        messages.append({'role': role, 'content': text})
    
    return {
        'model': 'anthropic/claude-3.5-sonnet',  # o 'openai/gpt-4o-mini' según prefieras
        'messages': messages,
        'max_tokens': body.get('max_tokens', 8192),
        'temperature': 0.7
    }


def claude_to_groq(body):
    """Convierte formato Claude a Groq (formato OpenAI)"""
    messages = []
    
    if body.get('system'):
        messages.append({'role': 'system', 'content': body.get('system')})
    
    for msg in body.get('messages', []):
        role = msg.get('role')
        content = msg.get('content', '')
        
        if isinstance(content, list):
            text = ' '.join(c.get('text', '') for c in content if c.get('type') == 'text')
        else:
            text = str(content)
            
        messages.append({'role': role, 'content': text})
    
    return {
        'model': 'llama-3.3-70b-versatile',
        'messages': messages,
        'max_tokens': body.get('max_tokens', 8192),
        'temperature': 0.7
    }


def is_rate_limit_error(status_code, data):
    """Detecta si el error es por rate limit/cuota agotada"""
    if status_code == 429:
        return True
    if isinstance(data, dict):
        error_msg = str(data.get('error', '')).lower()
        details = str(data.get('details', '')).lower()
        return any(x in error_msg or x in details for x in [
            'quota', 'rate limit', 'resource_exhausted', 'too many requests'
        ])
    return False


def call_gemini_with_retry(body, max_retries=3):
    """Llama a Gemini con exponential backoff para rate limits"""
    gemini_api_key = os.environ.get('GEMINI_API_KEY', '').strip()
    
    if not gemini_api_key:
        raise Exception('Falta GEMINI_API_KEY en las variables de entorno')
    
    payload = claude_to_gemini(body)
    url = f'https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={gemini_api_key}'
    
    for attempt in range(max_retries):
        try:
            resp = requests.post(url, json=payload, timeout=60)
            data = resp.json() if resp.text else {}
            
            if resp.status_code == 200:
                return data, 'gemini'
            
            # Si es rate limit, espera con backoff y reintenta
            if is_rate_limit_error(resp.status_code, data) and attempt < max_retries - 1:
                wait_time = (2 ** attempt) + random.uniform(0, 1)  # 1s, 2s, 4s...
                print(f'Gemini rate limit (intento {attempt + 1}), esperando {wait_time:.1f}s...')
                time.sleep(wait_time)
                continue
                
            # Otro error, no reintentar
            raise Exception(f'Gemini error {resp.status_code}: {data}')
            
        except requests.exceptions.Timeout:
            if attempt < max_retries - 1:
                time.sleep(2 ** attempt)
                continue
            raise Exception('Timeout al conectar con Gemini después de varios intentos')
        except requests.exceptions.RequestException as e:
            if attempt < max_retries - 1:
                time.sleep(2 ** attempt)
                continue
            raise Exception(f'Error de red con Gemini: {str(e)}')
    
    raise Exception('Gemini: Máximo de reintentos alcanzado')


def call_openrouter(body):
    """Fallback #1: OpenRouter"""
    if not OPENROUTER_API_KEY:
        raise Exception('OpenRouter no configurado')
    
    payload = claude_to_openrouter(body)
    headers = {
        'Authorization': f'Bearer {OPENROUTER_API_KEY}',
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://digimarket-rd.com',  # Requerido por OpenRouter
        'X-Title': 'DigiMarket RD Proxy'
    }
    
    resp = requests.post(
        'https://openrouter.ai/api/v1/chat/completions',
        json=payload,
        headers=headers,
        timeout=60
    )
    
    if resp.status_code != 200:
        raise Exception(f'OpenRouter error {resp.status_code}: {resp.text[:500]}')
    
    data = resp.json()
    return data['choices'][0]['message']['content'], 'openrouter'


def call_groq(body):
    """Fallback #2: Groq"""
    if not GROQ_API_KEY:
        raise Exception('Groq no configurado')
    
    payload = claude_to_groq(body)
    headers = {
        'Authorization': f'Bearer {GROQ_API_KEY}',
        'Content-Type': 'application/json'
    }
    
    resp = requests.post(
        'https://api.groq.com/openai/v1/chat/completions',
        json=payload,
        headers=headers,
        timeout=60
    )
    
    if resp.status_code != 200:
        raise Exception(f'Groq error {resp.status_code}: {resp.text[:500]}')
    
    data = resp.json()
    return data['choices'][0]['message']['content'], 'groq'


def generate_with_fallback(body):
    """
    Estrategia de fallback:
    1. Gemini con retry (3 intentos con backoff)
    2. OpenRouter (Claude/GPT)
    3. Groq (Llama)
    """
    errors = []
    
    # Intento 1: Gemini
    try:
        data, provider = call_gemini_with_retry(body)
        text = data['candidates'][0]['content']['parts'][0]['text']
        print(f'✅ Respuesta generada por {provider}')
        return text, provider
    except Exception as e:
        error_msg = f'Gemini: {str(e)}'
        print(f'❌ {error_msg}')
        errors.append(error_msg)
    
    # Intento 2: OpenRouter
    try:
        text, provider = call_openrouter(body)
        print(f'✅ Fallback a {provider} exitoso')
        return text, provider
    except Exception as e:
        error_msg = f'OpenRouter: {str(e)}'
        print(f'❌ {error_msg}')
        errors.append(error_msg)
    
    # Intento 3: Groq
    try:
        text, provider = call_groq(body)
        print(f'✅ Fallback a {provider} exitoso')
        return text, provider
    except Exception as e:
        error_msg = f'Groq: {str(e)}'
        print(f'❌ {error_msg}')
        errors.append(error_msg)
    
    # Nada funcionó
    raise Exception(f'Todos los proveedores fallaron:\n' + '\n'.join(errors))


@app.route('/', methods=['GET', 'HEAD'])
def root():
    return jsonify({'ok': True, 'service': 'gemini-claude-proxy-with-fallback'})


@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'ok': True,
        'gemini_model': GEMINI_MODEL,
        'claude_model': CLAUDE_MODEL_NAME,
        'fallback_providers': {
            'openrouter': bool(OPENROUTER_API_KEY),
            'groq': bool(GROQ_API_KEY)
        }
    })


@app.route('/v1/models', methods=['GET'])
def models():
    return jsonify({
        'data': [
            {
                'id': CLAUDE_MODEL_NAME,
                'type': 'model',
                'display_name': 'Claude Sonnet 4.5'
            }
        ],
        'first_id': CLAUDE_MODEL_NAME,
        'has_more': False
    })


@app.route('/v1/messages', methods=['POST'])
def messages():
    print(f'📨 Request recibida: {request.url}')
    
    body = request.get_json(silent=True) or {}
    
    try:
        text, provider = generate_with_fallback(body)
        
        return jsonify({
            'id': f'msg_{provider}',
            'type': 'message',
            'role': 'assistant',
            'content': [{'type': 'text', 'text': text}],
            'model': CLAUDE_MODEL_NAME,
            'stop_reason': 'end_turn',
            'usage': {'input_tokens': 0, 'output_tokens': 0},
            '_provider_used': provider  # Metadata para debugging
        })
        
    except Exception as e:
        print(f'💥 Error crítico: {str(e)}')
        return jsonify({
            'error': 'Todos los proveedores de IA están temporalmente no disponibles',
            'details': str(e),
            'suggestion': 'Por favor intenta de nuevo en unos segundos, o contacta soporte si el problema persiste.'
        }), 503


if __name__ == '__main__':
    print(f'🚀 Proxy con fallback corriendo en http://localhost:8082')
    print(f'   Modelo primario: {GEMINI_MODEL}')
    print(f'   Fallbacks: OpenRouter={bool(OPENROUTER_API_KEY)}, Groq={bool(GROQ_API_KEY)}')
    app.run(host='0.0.0.0', port=8082)