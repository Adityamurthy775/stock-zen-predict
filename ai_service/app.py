from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import yfinance as yf
from model import train_and_predict

app = FastAPI(title="Stock Zen Predict AI Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/predict")
def predict_stock(symbol: str, period: str = "1w"):
    try:
        yf_period = "2y" # Get 2 years of history for better indicators
        df = yf.download(symbol, period=yf_period, progress=False)
        
        if df.empty:
            raise HTTPException(status_code=404, detail="Stock data not found")
            
        prediction_results = train_and_predict(df, period)
        return prediction_results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
