import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Conv1D, MaxPooling1D, Flatten, Dense, Dropout, BatchNormalization
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import EarlyStopping
from .technical_indicators import get_feature_columns


class CNNPredictor:
    """1D CNN for pattern recognition in stock price data."""

    def __init__(self, sequence_length=30, epochs=50, batch_size=32):
        self.sequence_length = sequence_length
        self.epochs = epochs
        self.batch_size = batch_size
        self.model = None
        self.feature_scaler = MinMaxScaler()
        self.target_scaler = MinMaxScaler()

    def _build_model(self, n_features):
        model = Sequential([
            Conv1D(64, kernel_size=3, activation='relu',
                   input_shape=(self.sequence_length, n_features)),
            BatchNormalization(),
            MaxPooling1D(pool_size=2),
            Conv1D(128, kernel_size=3, activation='relu'),
            BatchNormalization(),
            MaxPooling1D(pool_size=2),
            Conv1D(64, kernel_size=3, activation='relu', padding='same'),
            Dropout(0.3),
            Flatten(),
            Dense(64, activation='relu'),
            Dropout(0.2),
            Dense(32, activation='relu'),
            Dense(1)
        ])
        model.compile(optimizer=Adam(learning_rate=0.001), loss='mse', metrics=['mae'])
        return model

    def _create_sequences(self, features, targets):
        X, y = [], []
        for i in range(self.sequence_length, len(features)):
            X.append(features[i - self.sequence_length:i])
            y.append(targets[i])
        return np.array(X), np.array(y)

    def train(self, df: pd.DataFrame, lookahead: int = 1):
        feature_cols = get_feature_columns()
        features = df[feature_cols].values
        targets = df['Close'].shift(-lookahead).values

        valid = ~np.isnan(targets)
        features = features[valid]
        targets = targets[valid].reshape(-1, 1)

        features_scaled = self.feature_scaler.fit_transform(features)
        targets_scaled = self.target_scaler.fit_transform(targets)

        X, y = self._create_sequences(features_scaled, targets_scaled.flatten())

        if len(X) < 10:
            return None

        split = int(len(X) * 0.8)
        X_train, X_val = X[:split], X[split:]
        y_train, y_val = y[:split], y[split:]

        self.model = self._build_model(X.shape[2])

        early_stop = EarlyStopping(monitor='val_loss', patience=5, restore_best_weights=True)

        history = self.model.fit(
            X_train, y_train,
            validation_data=(X_val, y_val),
            epochs=self.epochs,
            batch_size=self.batch_size,
            callbacks=[early_stop],
            verbose=0
        )
        return history

    def predict(self, df: pd.DataFrame) -> dict:
        if self.model is None:
            return None

        feature_cols = get_feature_columns()
        features = df[feature_cols].values
        features_scaled = self.feature_scaler.transform(features)

        if len(features_scaled) < self.sequence_length:
            return None

        X = features_scaled[-self.sequence_length:].reshape(1, self.sequence_length, -1)
        pred_scaled = self.model.predict(X, verbose=0)[0][0]
        predicted_price = self.target_scaler.inverse_transform([[pred_scaled]])[0][0]

        current_price = float(df['Close'].iloc[-1])
        change_pct = (predicted_price - current_price) / current_price * 100

        return {
            'model': 'CNN',
            'predicted_price': float(predicted_price),
            'current_price': current_price,
            'change_pct': change_pct,
            'confidence': self._calculate_confidence(change_pct),
        }

    def _calculate_confidence(self, change_pct):
        base = 82
        penalty = min(12, abs(change_pct) * 1.2)
        return max(58, base - penalty)

    def evaluate(self, df: pd.DataFrame, lookahead: int = 1) -> dict:
        if self.model is None:
            return {}

        feature_cols = get_feature_columns()
        features = df[feature_cols].values
        targets = df['Close'].shift(-lookahead).values

        valid = ~np.isnan(targets)
        features = features[valid]
        targets = targets[valid]

        features_scaled = self.feature_scaler.transform(features)
        X, y_true = self._create_sequences(features_scaled, targets)

        if len(X) == 0:
            return {}

        y_pred_scaled = self.model.predict(X, verbose=0).flatten()
        y_pred = self.target_scaler.inverse_transform(y_pred_scaled.reshape(-1, 1)).flatten()

        test_size = min(50, len(y_true) // 5)
        y_true_test = y_true[-test_size:]
        y_pred_test = y_pred[-test_size:]

        mse = float(np.mean((y_true_test - y_pred_test) ** 2))
        mae = float(np.mean(np.abs(y_true_test - y_pred_test)))
        rmse = float(np.sqrt(mse))
        mape = float(np.mean(np.abs((y_true_test - y_pred_test) / y_true_test)) * 100)

        ss_res = np.sum((y_true_test - y_pred_test) ** 2)
        ss_tot = np.sum((y_true_test - np.mean(y_true_test)) ** 2)
        r2 = 1 - (ss_res / (ss_tot + 1e-10))

        direction_correct = np.sum(
            np.sign(np.diff(y_true_test)) == np.sign(np.diff(y_pred_test))
        ) / (len(y_true_test) - 1) * 100

        return {
            'mse': mse, 'mae': mae, 'rmse': rmse, 'mape': mape,
            'r2': float(r2), 'direction_accuracy': float(direction_correct),
        }
