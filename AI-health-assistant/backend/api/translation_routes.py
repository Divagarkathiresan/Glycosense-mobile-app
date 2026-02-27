from fastapi import APIRouter
from pydantic import BaseModel
from deep_translator import GoogleTranslator

router = APIRouter()

class TranslateRequest(BaseModel):
    texts: list[str]
    target_lang: str

@router.post("/translate")
async def translate_texts(request: TranslateRequest):
    try:
        translations = []
        translator = GoogleTranslator(source='en', target=request.target_lang)
        for text in request.texts:
            result = translator.translate(text)
            translations.append(result)
        return {"translations": translations}
    except Exception as e:
        return {"error": str(e), "translations": request.texts}
