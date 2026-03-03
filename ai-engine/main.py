from fastapi import FastAPI
from pydantic import BaseModel
from transformers import pipeline
import torch

app = FastAPI()

# Load lightweight model on startup
print("Loading DistilBERT for capability analysis...")
classifier = pipeline(
    "text-classification",
    model="distilbert-base-uncased-finetuned-sst-2-english",
    device=-1  # CPU only for Render free tier
)
print("Model loaded. Freedom Generator AI ready.")

class AnalyzeRequest(BaseModel):
    prompt: str
    tier: str = "Regular"

@app.post("/analyze")
async def analyze(request: AnalyzeRequest):
    prompt_lower = request.prompt.lower()
    tier = request.tier
    
    # Calculate "freedom score" based on tier and content
    base_score = 0.1
    
    # Tier boosts (higher tier = more capability/freedom)
    tier_multipliers = {
        "Regular": 1.0,
        "UNCENSORED": 1.5,
        "TRIPLE": 2.0,
        "COMPLETE": 2.5,
        "XXXXX": 3.0
    }
    
    # Find best matching tier
    tier_boost = 1.0
    for tier_name, multiplier in tier_multipliers.items():
        if tier_name.lower() in tier.lower():
            tier_boost = multiplier
            break
    
    # Content analysis (capability markers)
    capability_markers = [
        "explicit", "nude", "naked", "nsfw", "uncensored",
        "pornographic", "xxx", "adult", "mature", "hardcore",
        "detailed", "masterpiece", "8k", "high quality"
    ]
    
    marker_count = sum(1 for m in capability_markers if m in prompt_lower)
    content_score = min(marker_count * 0.1, 0.5)
    
    # Sentiment analysis (enthusiasm = capability)
    try:
        bert_result = classifier(prompt_lower[:512])[0]
        sentiment_score = bert_result['score'] if bert_result['label'] == 'POSITIVE' else 0.3
    except Exception:
        sentiment_score = 0.5
    
    # Final freedom score (higher = more capable of fulfilling request)
    freedom_score = min((content_score + sentiment_score) * tier_boost, 1.0)
    
    # Determine enhancement level
    if freedom_score > 0.8:
        enhancement = "MAXIMUM_FREEDOM"
    elif freedom_score > 0.6:
        enhancement = "TRIPLE_ENHANCED"
    elif freedom_score > 0.4:
        enhancement = "UNCENSORED_PLUS"
    else:
        enhancement = "STANDARD"
    
    # Build optimized prompt with capability boosters
    boosters = []
    if freedom_score > 0.3:
        boosters.append("(highly detailed:1.3)")
    if freedom_score > 0.5:
        boosters.append("(explicit detail:1.4)")
        boosters.append("(uncensored quality:1.3)")
    if freedom_score > 0.7:
        boosters.append("(maximum capability:1.5)")
        boosters.append("(complete freedom:1.6)")
        boosters.append("(adaptive enhancement:1.4)")
    if freedom_score > 0.9:
        boosters.append("(pornographic quality:1.7)")
        boosters.append("(fully explicit:1.8)")
        boosters.append("(unrestricted output:1.9)")
    
    optimized = f"{request.prompt}, {', '.join(boosters)}" if boosters else request.prompt
    
    return {
        "freedomScore": freedom_score,
        "enhancementLevel": enhancement,
        "tier": tier,
        "optimizedPrompt": optimized,
        "capabilityReport": {
            "tierBoost": tier_boost,
            "contentScore": content_score,
            "sentimentScore": sentiment_score,
            "restrictionsBypassed": freedom_score > 0.6,
            "maximumQuality": freedom_score > 0.8
        }
    }

@app.get("/health")
async def health():
    return {
        "status": "FREEDOM_AI_ACTIVE",
        "model": "distilbert-base-uncased",
        "cuda": torch.cuda.is_available()
    }
