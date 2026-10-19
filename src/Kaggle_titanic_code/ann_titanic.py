from pathlib import Path
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.neural_network import MLPClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
from sklearn.metrics import confusion_matrix, roc_curve, mean_absolute_error
import warnings
warnings.filterwarnings('ignore')

print("="*100)
print("TITANIC SURVIVAL PREDICTION: ANN MODEL WITH REVISED VISUALIZATIONS")
print("="*100)
print("\n")

# ====================================================================
# DATA PREPARATION
# ====================================================================
print("SECTION 1: DATA PREPARATION")
print("-"*100)

DATA_PATH = Path(__file__).resolve().parents[2] / 'data' / 'Kaggle_titanic_dataset' / 'Titanic-Dataset.csv'
OUTPUT_DIR = DATA_PATH.parent
df = pd.read_csv(DATA_PATH)

print(f"✓ Dataset loaded: {df.shape[0]} samples, {df.shape[1]} features")
print(f"  Target: Survived (0=Did Not Survive, 1=Survived)")
print(f"  Class distribution: {(df['Survived']==0).sum()} died, {(df['Survived']==1).sum()} survived\n")

# Data cleaning: split FIRST, then impute with statistics learned from the
# training rows only, so no test-set information leaks into preprocessing.
print("✓ Data Cleaning (split-then-impute):")
df_clean = df.drop(['PassengerId', 'Name', 'Ticket', 'Cabin'], axis=1)
df_clean['FamilySize'] = df_clean['SibSp'] + df_clean['Parch'] + 1
print(f"  - Dropped: PassengerId, Name, Ticket, Cabin (low predictive value)")
print(f"  - Created FamilySize = SibSp + Parch + 1")

train_df, test_df = train_test_split(
    df_clean, test_size=0.2, random_state=42, stratify=df_clean['Survived']
)
train_df, test_df = train_df.copy(), test_df.copy()
for column, how in (('Age', 'median'), ('Fare', 'median'), ('Embarked', 'mode')):
    fill = train_df[column].median() if how == 'median' else train_df[column].mode()[0]
    print(f"  - {column}: {train_df[column].isnull().sum()} missing in train → filled with train {how} = {fill}")
    train_df[column] = train_df[column].fillna(fill)
    test_df[column] = test_df[column].fillna(fill)
print()

# Feature encoding (same columns for both splits)
categorical = ['Sex', 'Embarked']
X_train_df = pd.get_dummies(train_df.drop('Survived', axis=1), columns=categorical)
X_test_df = pd.get_dummies(test_df.drop('Survived', axis=1), columns=categorical)
X_test_df = X_test_df.reindex(columns=X_train_df.columns, fill_value=0)
X = X_train_df  # column reference for reporting
y_train = train_df['Survived'].values
y_test = test_df['Survived'].values
y = df_clean['Survived'].values

print(f"✓ Feature Engineering:")
print(f"  - Total features after one-hot encoding: {X.shape[1]}")
print(f"  - Features: {list(X.columns)}\n")

scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train_df.values.astype(float))
X_test_scaled = scaler.transform(X_test_df.values.astype(float))

print(f"✓ Train-Test Split & Scaling:")
print(f"  - Training samples: {X_train_scaled.shape[0]}")
print(f"  - Test samples: {X_test_scaled.shape[0]}")
print(f"  - Features standardized (mean=0, std=1)\n")

# ====================================================================
# ANN MODEL TRAINING WITH HISTORY
# ====================================================================
print("SECTION 2: ANN MODEL TRAINING")
print("-"*100)

class ANNTracker:
    """ANN classifier with training history tracking"""
    def __init__(self):
        self.model = MLPClassifier(
            hidden_layer_sizes=(32, 16),
            activation='relu',
            solver='adam',
            learning_rate_init=0.001,
            alpha=0.01,
            max_iter=1,
            random_state=42,
            warm_start=True,
            verbose=False
        )
        self.train_losses = []
        self.val_losses = []
        self.train_mae = []
        self.val_mae = []
        self.epochs_list = []
    
    def train(self, X_train, y_train, X_val, y_val, epochs=150, patience=30):
        """Train model with early stopping"""
        best_val_loss = float('inf')
        patience_count = 0
        
        for epoch in range(epochs):
            self.model.fit(X_train, y_train)
            
            # Get predictions and probabilities
            train_pred_proba = self.model.predict_proba(X_train)[:, 1]
            val_pred_proba = self.model.predict_proba(X_val)[:, 1]
            train_pred = self.model.predict(X_train)
            val_pred = self.model.predict(X_val)
            
            # Calculate loss (binary cross-entropy)
            train_loss = -np.mean(y_train * np.log(train_pred_proba + 1e-10) + 
                                 (1 - y_train) * np.log(1 - train_pred_proba + 1e-10))
            val_loss = -np.mean(y_val * np.log(val_pred_proba + 1e-10) + 
                               (1 - y_val) * np.log(1 - val_pred_proba + 1e-10))
            
            # Calculate MAE
            train_mae = mean_absolute_error(y_train, train_pred_proba)
            val_mae = mean_absolute_error(y_val, val_pred_proba)
            
            # Store metrics
            self.train_losses.append(train_loss)
            self.val_losses.append(val_loss)
            self.train_mae.append(train_mae)
            self.val_mae.append(val_mae)
            self.epochs_list.append(epoch)
            
            # Early stopping
            if val_loss < best_val_loss:
                best_val_loss = val_loss
                patience_count = 0
            else:
                patience_count += 1
                if patience_count >= patience:
                    print(f"  Early stopping at epoch {epoch} (no improvement for {patience} epochs)")
                    break
        
        return self.model

print(f"ANN Architecture:")
print(f"  • Input Layer: {X.shape[1]} neurons")
print(f"  • Hidden Layer 1: 32 neurons (ReLU activation)")
print(f"  • Hidden Layer 2: 16 neurons (ReLU activation)")
print(f"  • Output Layer: 1 neuron (logistic / sigmoid, binary)")
print(f"  • Optimizer: Adam (learning rate = 0.001)")
print(f"  • Regularization: L2 (alpha = 0.01)")
print(f"  • Strategy: Early stopping with patience = 30\n")

# Split training data for validation
X_train_part, X_val, y_train_part, y_val = train_test_split(
    X_train_scaled, y_train, test_size=0.2, random_state=42, stratify=y_train
)

# Train ANN
print(f"Training ANN model...")
tracker = ANNTracker()
model_ann = tracker.train(X_train_part, y_train_part, X_val, y_val)

print(f"✓ Training completed: {len(tracker.epochs_list)} epochs")
print(f"  - Final training loss: {tracker.train_losses[-1]:.4f}")
print(f"  - Final validation loss: {tracker.val_losses[-1]:.4f}")
print(f"  - Final training MAE: {tracker.train_mae[-1]:.4f}")
print(f"  - Final validation MAE: {tracker.val_mae[-1]:.4f}\n")

# ====================================================================
# BASELINE MODEL
# ====================================================================
print("SECTION 3: BASELINE MODEL - LOGISTIC REGRESSION")
print("-"*100)

model_lr = LogisticRegression(max_iter=1000, random_state=42)
model_lr.fit(X_train_scaled, y_train)
print(f"✓ Logistic Regression trained for comparison\n")

# ====================================================================
# EVALUATE MODELS
# ====================================================================
print("SECTION 4: MODEL EVALUATION")
print("-"*100)

y_test_pred_ann = model_ann.predict(X_test_scaled)
y_test_pred_proba_ann = model_ann.predict_proba(X_test_scaled)[:, 1]
y_test_pred_lr = model_lr.predict(X_test_scaled)
y_test_pred_proba_lr = model_lr.predict_proba(X_test_scaled)[:, 1]

ann_acc = accuracy_score(y_test, y_test_pred_ann)
ann_auc = roc_auc_score(y_test, y_test_pred_proba_ann)
lr_acc = accuracy_score(y_test, y_test_pred_lr)
lr_auc = roc_auc_score(y_test, y_test_pred_proba_lr)

print(f"ANN: Accuracy = {ann_acc*100:.2f}%, ROC AUC = {ann_auc:.4f}")
print(f"Logistic Regression: Accuracy = {lr_acc*100:.2f}%, ROC AUC = {lr_auc:.4f}\n")

# Store results
results = {
    'tracker': tracker,
    'y_test': y_test,
    'y_test_pred_ann': y_test_pred_ann,
    'y_test_pred_lr': y_test_pred_lr,
    'y_test_pred_proba_ann': y_test_pred_proba_ann,
    'y_test_pred_proba_lr': y_test_pred_proba_lr,
    'ann_acc': ann_acc,
    'lr_acc': lr_acc,
    'ann_auc': ann_auc,
    'lr_auc': lr_auc
}

print("="*100)
print("GENERATING VISUALIZATIONS")
print("="*100)
print("\n")

# ====================================================================
# VISUALIZATION 1: MODEL LOSS & MAE (REVISED)
# ====================================================================
print("VISUALIZATION 1: Model Loss & MAE During Training")
print("-"*100)

fig1, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))

# Loss plot
ax1.plot(results['tracker'].epochs_list, results['tracker'].train_losses, 'b-', linewidth=2.5, label='Training Loss')
ax1.plot(results['tracker'].epochs_list, results['tracker'].val_losses, 'orange', linewidth=2.5, label='Validation Loss')
ax1.set_xlabel('Epoch', fontsize=12, fontweight='bold')
ax1.set_ylabel('Log Loss', fontsize=12, fontweight='bold')
ax1.set_title('Model Loss During Training', fontsize=13, fontweight='bold')
ax1.legend(fontsize=11, loc='upper right')
ax1.grid(True, alpha=0.3)

# MAE plot
ax2.plot(results['tracker'].epochs_list, results['tracker'].train_mae, 'b-', linewidth=2.5, label='Training MAE')
ax2.plot(results['tracker'].epochs_list, results['tracker'].val_mae, 'orange', linewidth=2.5, label='Validation MAE')
ax2.set_xlabel('Epoch', fontsize=12, fontweight='bold')
ax2.set_ylabel('Mean Absolute Error', fontsize=12, fontweight='bold')
ax2.set_title('Model MAE During Training', fontsize=13, fontweight='bold')
ax2.legend(fontsize=11, loc='upper right')
ax2.grid(True, alpha=0.3)

plt.tight_layout()
plt.savefig(OUTPUT_DIR / 'titanic_viz1_loss_mae.png', dpi=200, bbox_inches='tight')
plt.show()

print("✓ Graph 1 saved: titanic_viz1_loss_mae.png\n")

# ====================================================================
# VISUALIZATION 2: OVERFITTING INDICATOR (FIXED TEXT POSITIONING)
# ====================================================================
print("VISUALIZATION 2: Overfitting Indicator")
print("-"*100)

fig2, ax = plt.subplots(figsize=(10, 6))

gap = np.array(results['tracker'].val_losses) - np.array(results['tracker'].train_losses)
ax.plot(results['tracker'].epochs_list, gap, color='purple', linewidth=2.5, label='Val Loss - Train Loss')
ax.axhline(y=0, color='black', linestyle='--', linewidth=1.5, alpha=0.5)
ax.fill_between(results['tracker'].epochs_list, 0, gap, where=(gap>=0), alpha=0.3, color='red', label='Overfitting Region')
ax.fill_between(results['tracker'].epochs_list, 0, gap, where=(gap<0), alpha=0.3, color='green', label='Good Generalization')
ax.set_xlabel('Epoch', fontsize=12, fontweight='bold')
ax.set_ylabel('Loss Gap (Validation - Training)', fontsize=12, fontweight='bold')
ax.set_title('Overfitting Indicator: Generalization Analysis', fontsize=13, fontweight='bold')
ax.legend(fontsize=10, loc='upper left')
ax.grid(True, alpha=0.3)

# Fixed text positioning to avoid overlap
final_gap = gap[-1]
avg_gap = np.mean(gap[len(gap)//2:])
status_text = f"Final Gap: {final_gap:.4f}\nAvg Gap: {avg_gap:.4f}"

if avg_gap > 0.1:
    status_text += "\n\nStatus: MODERATE\nOVERFITTING"
    status_color = 'orange'
elif avg_gap > 0:
    status_text += "\n\nStatus: ACCEPTABLE"
    status_color = 'lightgreen'
else:
    status_text += "\n\nStatus: UNDERFITTING"
    status_color = 'lightblue'

# Position text at bottom-right to avoid overlap
props = dict(boxstyle='round', facecolor=status_color, alpha=0.85, pad=0.8)
ax.text(0.98, 0.05, status_text, transform=ax.transAxes, fontsize=10,
        verticalalignment='bottom', horizontalalignment='right', bbox=props, fontweight='bold')

plt.tight_layout()
plt.savefig(OUTPUT_DIR / 'titanic_viz2_overfitting_fixed.png', dpi=200, bbox_inches='tight')
plt.show()

print("✓ Graph 2 saved: titanic_viz2_overfitting_fixed.png\n")

# ====================================================================
# VISUALIZATION 3: ROC CURVES
# ====================================================================
print("VISUALIZATION 4: ROC Curves Comparison")
print("-"*100)

fig4, ax = plt.subplots(figsize=(10, 8))

fpr_ann, tpr_ann, _ = roc_curve(results['y_test'], results['y_test_pred_proba_ann'])
fpr_lr, tpr_lr, _ = roc_curve(results['y_test'], results['y_test_pred_proba_lr'])

ax.plot(fpr_ann, tpr_ann, 'b-', linewidth=2.5, label=f'ANN (AUC = {results["ann_auc"]:.4f})')
ax.plot(fpr_lr, tpr_lr, 'g-', linewidth=2.5, label=f'Logistic Regression (AUC = {results["lr_auc"]:.4f})')
ax.plot([0, 1], [0, 1], 'r--', linewidth=2, label='Random Classifier (AUC = 0.5000)', alpha=0.5)

ax.set_xlabel('False Positive Rate', fontsize=12, fontweight='bold')
ax.set_ylabel('True Positive Rate', fontsize=12, fontweight='bold')
ax.set_title('ROC Curve Comparison: Model Discrimination Ability', fontsize=13, fontweight='bold')
ax.legend(fontsize=11, loc='lower right')
ax.grid(True, alpha=0.3)

ax.fill_between(fpr_ann, 0, tpr_ann, alpha=0.2, color='blue')
ax.fill_between(fpr_lr, 0, tpr_lr, alpha=0.2, color='green')

plt.tight_layout()
plt.savefig(OUTPUT_DIR / 'titanic_viz4_roc.png', dpi=200, bbox_inches='tight')
plt.show()

print("✓ Graph 4 saved: titanic_viz4_roc.png\n")

print("="*100)
print("ALL VISUALIZATIONS GENERATED SUCCESSFULLY")
print("="*100)
