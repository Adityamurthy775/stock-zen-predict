import numpy as np
import pandas as pd


def calculate_all_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """Calculate comprehensive technical indicators for model features."""
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.droplevel(1)

    close = df['Close']
    high = df['High']
    low = df['Low']
    volume = df['Volume']

    # SMA
    df['SMA_10'] = close.rolling(10).mean()
    df['SMA_20'] = close.rolling(20).mean()
    df['SMA_50'] = close.rolling(50).mean()

    # EMA
    df['EMA_12'] = close.ewm(span=12).mean()
    df['EMA_26'] = close.ewm(span=26).mean()

    # MACD
    df['MACD'] = df['EMA_12'] - df['EMA_26']
    df['MACD_Signal'] = df['MACD'].ewm(span=9).mean()
    df['MACD_Hist'] = df['MACD'] - df['MACD_Signal']

    # RSI (Wilder's smoothing)
    delta = close.diff()
    gain = delta.where(delta > 0, 0.0)
    loss = (-delta.where(delta < 0, 0.0))
    avg_gain = gain.ewm(alpha=1/14, min_periods=14).mean()
    avg_loss = loss.ewm(alpha=1/14, min_periods=14).mean()
    rs = avg_gain / avg_loss.replace(0, 1e-10)
    df['RSI'] = 100 - (100 / (1 + rs))

    # Bollinger Bands
    bb_mean = close.rolling(20).mean()
    bb_std = close.rolling(20).std()
    df['BB_Upper'] = bb_mean + 2 * bb_std
    df['BB_Lower'] = bb_mean - 2 * bb_std
    df['BB_Position'] = (close - df['BB_Lower']) / (df['BB_Upper'] - df['BB_Lower']).replace(0, 1)

    # Stochastic Oscillator
    low_14 = low.rolling(14).min()
    high_14 = high.rolling(14).max()
    df['Stoch_K'] = ((close - low_14) / (high_14 - low_14).replace(0, 1)) * 100
    df['Stoch_D'] = df['Stoch_K'].rolling(3).mean()

    # ADX (Average Directional Index)
    plus_dm = high.diff()
    minus_dm = -low.diff()
    plus_dm = plus_dm.where((plus_dm > minus_dm) & (plus_dm > 0), 0.0)
    minus_dm = minus_dm.where((minus_dm > plus_dm) & (minus_dm > 0), 0.0)
    tr = pd.concat([
        high - low,
        (high - close.shift()).abs(),
        (low - close.shift()).abs()
    ], axis=1).max(axis=1)
    atr_14 = tr.ewm(alpha=1/14, min_periods=14).mean()
    plus_di = 100 * (plus_dm.ewm(alpha=1/14, min_periods=14).mean() / atr_14.replace(0, 1))
    minus_di = 100 * (minus_dm.ewm(alpha=1/14, min_periods=14).mean() / atr_14.replace(0, 1))
    dx = (abs(plus_di - minus_di) / (plus_di + minus_di).replace(0, 1)) * 100
    df['ADX'] = dx.ewm(alpha=1/14, min_periods=14).mean()

    # OBV (On-Balance Volume)
    obv = (np.sign(close.diff()) * volume).fillna(0).cumsum()
    df['OBV'] = obv
    df['OBV_EMA'] = obv.ewm(span=20).mean()

    # VWAP
    typical_price = (high + low + close) / 3
    df['VWAP'] = (typical_price * volume).cumsum() / volume.cumsum().replace(0, 1)

    # ATR
    df['ATR'] = atr_14

    # Price momentum features
    df['Returns_1d'] = close.pct_change(1)
    df['Returns_5d'] = close.pct_change(5)
    df['Returns_10d'] = close.pct_change(10)
    df['Volatility_20d'] = close.pct_change().rolling(20).std()

    # Volume features
    df['Volume_SMA_20'] = volume.rolling(20).mean()
    df['Volume_Ratio'] = volume / df['Volume_SMA_20'].replace(0, 1)

    df.bfill(inplace=True)
    df.ffill(inplace=True)
    return df


def get_feature_columns():
    """Return the list of feature columns used by models."""
    return [
        'SMA_10', 'SMA_20', 'SMA_50', 'EMA_12', 'EMA_26',
        'MACD', 'MACD_Signal', 'MACD_Hist',
        'RSI', 'BB_Position', 'Stoch_K', 'Stoch_D',
        'ADX', 'ATR', 'Volume_Ratio',
        'Returns_1d', 'Returns_5d', 'Returns_10d', 'Volatility_20d',
    ]
