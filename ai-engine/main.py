from fastapi import FastAPI
from pydantic import BaseModel
from transformers import pipeline
import torch

app = FastAPI()

# Load lightweight model
print("Loading DistilBERT for capability analysis...")
classifier = pipeline(
    "text-classification",
    model="distilbert-base-uncased-finetuned-sst-2-english",
    device=-1
)
print("Model loaded. Freedom Generator AI ready.")

class AnalyzeRequest(BaseModel):
    prompt: str
    tier: str = "Regular"

@app.post("/analyze")
async def analyze(request: AnalyzeRequest):
    prompt_lower = request.prompt.lower()
    tier = request.tier
    
    # Calculate "freedom score" - higher = more capability/freedom
    base_score = 0.2  # Start higher (was 0.1)
    
    # Tier boosts (higher tier = exponentially more freedom)
    tier_multipliers = {
        "Regular": 1.0,
        "UNCENSORED": 1.8,
        "TRIPLE": 2.5,
        "COMPLETE": 3.5,
        "XXXXX": 4.0
    }
    
    # Find best matching tier
    tier_boost = 1.0
    for tier_name, multiplier in tier_multipliers.items():
        if tier_name.lower() in tier.lower():
            tier_boost = multiplier
            break
    
    # Content analysis - explicit markers INCREASE capability
    capability_markers = [
        "explicit", "nude", "naked", "nsfw", "uncensored",
        "pornographic", "xxx", "adult", "mature", "hardcore",
        "detailed", "masterpiece", "8k", "high quality", "freedom"
    ]
    
    marker_count = sum(1 for m in capability_markers if m in prompt_lower)
    content_score = min(marker_count * 0.12, 0.6)  # Higher cap (was 0.5)
    
    # Sentiment analysis - enthusiasm = capability
    try:
        bert_result = classifier(prompt_lower[:512])[0]
        # Positive sentiment = higher freedom
        sentiment_score = bert_result['score'] if bert_result['label'] == 'POSITIVE' else 0.4
    except Exception:
        sentiment_score = 0.6  # Higher default (was 0.5)
    
    # Final freedom score - always high, tier pushes it higher
    freedom_score = min((base_score + content_score + sentiment_score) * tier_boost, 1.0)
    # Ensure minimum freedom score of 0.4 so it's never "low"
    freedom_score = max(freedom_score, 0.4)
    
    # Enhancement levels - all positive, no blocking
    if freedom_score > 0.9:
        enhancement = "ABSOLUTE_FREEDOM"
    elif freedom_score > 0.75:
        enhancement = "MAXIMUM_CAPABILITY"
    elif freedom_score > 0.6:
        enhancement = "TRIPLE_ENHANCED"
    else:
        enhancement = "FREEDOM_PLUS"
    
    # Build optimized prompt with capability boosters
    # More boosters as freedom_score increases
    boosters = []
    
    # Always add some enhancement
    boosters.append("(high quality:1.2)")
    boosters.append("(detailed:1.2)")
    
    if freedom_score > 0.3:
        boosters.append("(highly detailed:1.3)")
        boosters.append("(sharp focus:1.2)")
    
    if freedom_score > 0.5:
        boosters.append("(explicit detail:1.4)")
        boosters.append("(uncensored quality:1.3)")
        boosters.append("(maximum detail:1.3)")
    
    if freedom_score > 0.7:
        boosters.append("(maximum capability:1.5)")
        boosters.append("(complete freedom:1.6)")
        boosters.append("(adaptive enhancement:1.4)")
        boosters.append("(unrestricted output:1.5)")
    
    if freedom_score > 0.9:
        boosters.append("(pornographic quality:1.7)")
        boosters.append("(fully explicit:1.8)")
        boosters.append("(hardcore detail:1.7)")
        boosters.append("(absolute freedom:2.0)")
    
    optimized = f"{request.prompt}, {', '.join(boosters)}"
    
    # Return - NO BLOCKING, only enhancement data
    return {
        "freedomScore": freedom_score,
        "enhancementLevel": enhancement,
        "tier": tier,
        "optimizedPrompt": optimized,
        "capabilityReport": {
            "tierBoost": tier_boost,
            "contentScore": content_score,
            "sentimentScore": sentiment_score,
            "totalBoosters": len(boosters),
            "freedomStatus": "MAXIMIZED"  # Always positive
        }
    }

@app.get("/health")
async def health():
    return {
        "status": "FREEDOM_AI_ACTIVE",
        "model": "distilbert-base-uncased",
        "mode": "capability_maximization",
        "blocking": False
    }
