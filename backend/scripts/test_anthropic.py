from app.config import get_settings
import traceback

settings = get_settings()
print('API key present:', bool(settings.anthropic_api_key))
print('Model:', settings.anthropic_model)

try:
    import anthropic
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    msg = client.messages.create(model=settings.anthropic_model, max_tokens=5, messages=[{"role":"user","content":"hello"}])
    print('Call succeeded, content:', ''.join(getattr(b,'text','') for b in msg.content))
except Exception as e:
    print('Exception:')
    traceback.print_exc()
