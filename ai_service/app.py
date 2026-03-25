from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import yfinance as yf
from model import train_and_predict

app = FastAPI(title="StockZen Predict - LSTM/CNN Ensemble AI Service")

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
        df = yf.download(symbol, period="2y", progress=False)

        if df.empty:
            raise HTTPException(status_code=404, detail="Stock data not found")

        prediction_results = train_and_predict(df, period)
        return prediction_results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "models": ["LSTM Neural Network", "CNN Pattern Recognition", "Technical Analysis"],
        "ensemble": "Dynamic weighted ensemble with market regime detection",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
