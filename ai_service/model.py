import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from datetime import timedelta

def calculate_technical_indicators(df):
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.droplevel(1)
        
    df['SMA_20'] = df['Close'].rolling(window=20).mean()
    df['SMA_50'] = df['Close'].rolling(window=50).mean()
    
    delta = df['Close'].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
    rs = gain / loss
    df['RSI'] = 100 - (100 / (1 + rs))
    
    df.bfill(inplace=True)
    return df

def train_and_predict(df, forecast_period="1mo"):
    df = calculate_technical_indicators(df.copy())
    
    features = ['SMA_20', 'SMA_50', 'RSI']
    
    lookahead = 30
    if forecast_period == '1d':
        lookahead = 1
    elif forecast_period == '1w':
        lookahead = 7
    elif forecast_period == '3mo':
        lookahead = 90
    elif forecast_period == '1y':
        lookahead = 365
        
    df['Target'] = df['Close'].shift(-lookahead)
    train_df = df.dropna()
    
    if len(train_df) < 50:
         last_price = float(df['Close'].iloc[-1])
         return {"predicted_price": last_price * 1.05, "confidence": 0.5, "trend": "neutral", "recommendation": "Hold", "lookahead_days": lookahead}
    
    X = train_df[features]
    y = train_df['Target']
    
    model = LinearRegression()
    model.fit(X, y)
    
    latest_data = df[features].iloc[-1:].copy()
    predicted_price = float(model.predict(latest_data)[0])
    
    current_price = float(df['Close'].iloc[-1])
    
    trend = "bullish" if predicted_price > current_price * 1.01 else ("bearish" if predicted_price < current_price * 0.99 else "neutral")
    recommendation = "Buy" if predicted_price > current_price * 1.05 else ("Sell" if predicted_price < current_price * 0.95 else "Hold")
    
    return {
        "current_price": current_price,
        "predicted_price": predicted_price,
        "trend": trend,
        "recommendation": recommendation,
        "lookahead_days": lookahead,
        "confidence": 0.85 # Mocked confidence for linear regression
    }
