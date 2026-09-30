"""Interactive Titanic Survival Game web app."""

import sys
from pathlib import Path

import pandas as pd
import plotly.express as px
import streamlit as st
import streamlit.components.v1 as components

APP_DIR = Path(__file__).resolve().parent
if str(APP_DIR) not in sys.path:
    sys.path.insert(0, str(APP_DIR))
GAME_HTML = (APP_DIR / "static" / "game.html").read_text(encoding="utf-8")

from titanic_game.data import load_titanic, prepare_features
from titanic_game.game import lifeboat_challenge, new_challenge, public_profile, score_guess
from titanic_game.model import explanation_frame, predict_survival, train_models

st.set_page_config(page_title="Titanic Survival Game", page_icon="⚓", layout="wide")
st.markdown(
    """
    <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Playfair+Display:wght@600;700&display=swap');
    :root { --navy:#071a2d; --ink:#102a43; --brass:#d6a84f; --foam:#edf5f7; --red:#a43d35; }
    .stApp { background: radial-gradient(circle at 20% 0%, #f7fbfc 0, #edf5f7 42%, #dcecf0 100%); color:var(--ink); }
    h1,h2,h3 { font-family:'Playfair Display', Georgia, serif; color:var(--navy); }
    p, label, .stMarkdown, .stCaption { font-family:'DM Sans', sans-serif; color:#183247 !important; }
    [data-testid="stSidebar"], [data-testid="stSidebar"] > div:first-child { background:#edf5f7 !important; }
    [data-testid="stSidebar"], [data-testid="stSidebar"] * { color:#183247 !important; }
    [data-testid="stWidgetLabel"] *, [data-baseweb="select"] * { color:#183247 !important; }
    [data-testid="stSidebar"] [data-baseweb="select"],
    [data-testid="stSidebar"] [data-baseweb="select"] > div,
    [data-testid="stSidebar"] [data-baseweb="select"] > div > div,
    [data-testid="stSidebar"] [role="combobox"] { background:#fff !important; color:#183247 !important; border-color:#8aaeba !important; }
    .masthead p, .deck-card, .deck-card span, .lifeboat, .masthead h1 { color:#fff !important; }
    .deck-card small { color:#d6a84f !important; }
    .masthead { padding:1.4rem 1.7rem; border-radius:22px; color:#fff; background:linear-gradient(125deg,#061421,#0e3853 58%,#a43d35); box-shadow:0 12px 35px #082c4030; margin-bottom:1rem; }
    .masthead h1 { color:#fff; margin:0; font-size:clamp(2.1rem,5vw,4.3rem); letter-spacing:-.04em; }
    .masthead p { color:#d9edf0; max-width:680px; margin:.4rem 0 0; font-size:1.05rem; }
    .deck-card { background:linear-gradient(145deg,#102f45,#071a2d); border:1px solid #d6a84f66; border-radius:18px; padding:1rem 1.2rem; color:#f7f1de; min-height:128px; }
    .deck-card small { color:#d6a84f; text-transform:uppercase; letter-spacing:.12em; }
    .deck-card strong { display:block; font-size:2rem; margin:.35rem 0; }
    .status-card { background:#ffffffbf; border:1px solid #b3cdd5; border-radius:16px; padding:1rem 1.2rem; }
    .history-card { background:#fff; border-left:5px solid var(--brass); border-radius:12px; padding:1rem 1.2rem; margin:.7rem 0; box-shadow:0 4px 18px #123b4b12; }
    .history-card b { color:var(--navy); }
    .lifeboat { display:flex; gap:.45rem; align-items:center; padding:1rem; border-radius:14px; background:linear-gradient(135deg,#b44a3e,#7d2927); color:#fff; font-size:1.15rem; margin:.5rem 0 1rem; }
    .lifeboat span { font-size:2rem; }
    @media (max-width: 700px) { .masthead { padding:1rem; } .masthead h1 { font-size:2.25rem; } .deck-card strong { font-size:1.5rem; } }
    </style>
    """,
    unsafe_allow_html=True,
)


@st.cache_data
def get_data():
    return load_titanic()


@st.cache_resource
def get_models(df):
    return train_models(df)


def reset_game():
    st.session_state.level = 1
    st.session_state.round = 1
    st.session_state.score = 0
    st.session_state.challenge = new_challenge(df)
    st.session_state.lifeboat = None
    st.session_state.revealed = False
    st.session_state.recorded = False
    st.session_state.finished = False
    st.session_state.started = True


def advance_round():
    level, round_number = st.session_state.level, st.session_state.round
    st.session_state.revealed = False
    if level < 2 and round_number >= 3:
        st.session_state.level = 2
        st.session_state.round = 1
        st.session_state.challenge = new_challenge(df)
    elif level == 2 and round_number >= 3:
        st.session_state.level = 3
        st.session_state.round = 1
        st.session_state.lifeboat = lifeboat_challenge(df)
    elif level == 3:
        st.session_state.finished = True
    else:
        st.session_state.round += 1
        st.session_state.challenge = new_challenge(df)


def record_result():
    if st.session_state.get("recorded"):
        return
    st.session_state.leaderboard.append({
        "player": st.session_state.player_name or "Anonymous",
        "score": st.session_state.score,
        "level": "Captain's station",
    })
    st.session_state.leaderboard.sort(key=lambda item: item["score"], reverse=True)
    st.session_state.recorded = True


df = get_data()
bundles = get_models(df)
if "leaderboard" not in st.session_state:
    st.session_state.leaderboard = []
if "started" not in st.session_state:
    st.session_state.started = False
if "finished" not in st.session_state:
    st.session_state.finished = False
if "player_name" not in st.session_state:
    st.session_state.player_name = ""

st.markdown(
    '<div class="masthead"><h1>⚓ Titanic: The Last Crossing</h1>'
    '<p>Make decisions with incomplete information, learn what the historical data says, and see how a classifier explains its call.</p></div>',
    unsafe_allow_html=True,
)

model_name = st.sidebar.selectbox("Model lens", list(bundles), index=0)
bundle = bundles[model_name]
st.sidebar.markdown("### Voyage score")
st.sidebar.metric("Current score", st.session_state.get("score", 0))
st.sidebar.caption("Scores are stored for this browser session.")
st.sidebar.markdown("### Model quality")
for metric, value in bundle.metrics.items():
    st.sidebar.metric(metric.replace("_", " ").title(), f"{value:.3f}")

tab_game, tab_explain, tab_history, tab_data = st.tabs(
    ["🎮 Play the voyage", "🔎 Model lens", "📜 Historical context", "📊 Data room"]
)

with tab_game:
    st.subheader("Interactive rescue game")
    st.caption("Choose a role: drag passengers into the lifeboat, or drag your own character through the ship to escape.")
    components.html(GAME_HTML, height=780, scrolling=False)
    st.divider()
    st.subheader("Optional model quiz")
    if not st.session_state.started:
        st.subheader("Welcome aboard")
        st.write("Three stages. Nine decisions. One final lifeboat call.")
        st.session_state.player_name = st.text_input("Your name for the leaderboard", placeholder="Navigator")
        if st.button("Board the ship", type="primary"):
            reset_game()
            st.rerun()
    elif st.session_state.get("finished"):
        record_result()
        st.markdown(
            '<div class="deck-card"><small>Voyage complete</small><strong>Final score: '
            + str(st.session_state.score)
            + ' / 11</strong><span>Your result has been added to the session leaderboard.</span></div>',
            unsafe_allow_html=True,
        )
        st.subheader("Leaderboard")
        board = pd.DataFrame(st.session_state.leaderboard)
        if not board.empty:
            board.index = board.index + 1
            st.dataframe(
                board.rename(columns={"player": "Navigator", "score": "Score", "level": "Stage"}),
                use_container_width=True,
            )
        if st.button("Sail again"):
            reset_game()
            st.rerun()
    else:
        level = st.session_state.level
        round_number = st.session_state.round
        stage_names = {
            1: ("Deck Check", "Read the passenger profile."),
            2: ("Cabin Analyst", "Use the evidence, then commit."),
            3: ("Lifeboat Station", "Rank the passengers before the signal changes."),
        }
        stage_name, stage_help = stage_names[level]
        st.markdown(
            f'<div class="status-card"><b>Stage {level} · {stage_name}</b><br>{stage_help}<br>Round {round_number} of 3</div>',
            unsafe_allow_html=True,
        )
        st.progress(((level - 1) * 3 + round_number) / 9)

        if level < 3:
            row = st.session_state.challenge.passenger
            st.markdown(
                '<div class="deck-card"><small>Passenger manifest</small><strong>Profile under review</strong><span>Choose before you see the outcome.</span></div>',
                unsafe_allow_html=True,
            )
            st.dataframe(pd.DataFrame([public_profile(row)]), hide_index=True, use_container_width=True)
            guess = st.radio(
                "Your call",
                ["Did not survive", "Survived"],
                horizontal=True,
                key=f"guess_{level}_{round_number}",
            )
            confidence = 50
            if level == 2:
                confidence = st.slider(
                    "How confident are you?", 50, 100, 70, 5, key=f"confidence_{round_number}"
                )
            if not st.session_state.revealed:
                if st.button("Sound the call", type="primary", key=f"submit_{level}_{round_number}"):
                    actual = int(row["Survived"])
                    correct = score_guess(int(guess == "Survived"), actual)
                    points = correct + int(level == 2 and correct and confidence >= 80)
                    st.session_state.score += points
                    st.session_state.revealed = True
                    st.session_state.last_actual = actual
                    st.session_state.last_points = points
                    st.session_state.last_probability = predict_survival(bundle, pd.DataFrame([row]))
                    st.rerun()
            else:
                actual = st.session_state.last_actual
                st.success(
                    ("Correct" if actual == int(guess == "Survived") else "The data had another story.")
                    + f" · +{st.session_state.last_points} point(s)"
                )
                st.write(f"Historical outcome: **{'Survived' if actual else 'Did not survive'}**")
                st.metric("Model survival probability", f"{st.session_state.last_probability:.1%}")
                st.caption("The model describes patterns in this dataset; it does not establish why an individual outcome happened.")
                if st.button("Next decision", type="primary"):
                    advance_round()
                    st.rerun()
        else:
            st.markdown(
                '<div class="lifeboat"><span>🛟</span><div><b>Lifeboat station</b><br>Select the passenger the model ranks safest.</div></div>',
                unsafe_allow_html=True,
            )
            choices = st.session_state.lifeboat
            probabilities = [
                predict_survival(bundle, pd.DataFrame([choices.iloc[i]])) for i in range(len(choices))
            ]
            choice = st.radio(
                "Who gets the safest berth?",
                [f"Passenger {i + 1}" for i in range(3)],
                horizontal=True,
            )
            if not st.session_state.revealed:
                if st.button("Lower the boat", type="primary"):
                    selected = int(choice.split()[-1]) - 1
                    best = max(range(3), key=lambda i: probabilities[i])
                    st.session_state.score += 2 if selected == best else 0
                    st.session_state.revealed = True
                    st.session_state.best_passenger = best
                    st.session_state.lifeboat_probs = probabilities
                    st.rerun()
            else:
                best = st.session_state.best_passenger
                st.success(
                    f"The model ranked Passenger {best + 1} highest. "
                    + ("Your call matched the model." if int(choice.split()[-1]) - 1 == best else "Your call differed from the model.")
                )
                chart = pd.DataFrame(
                    {
                        "Passenger": [f"Passenger {i + 1}" for i in range(3)],
                        "Model probability": st.session_state.lifeboat_probs,
                    }
                )
                st.plotly_chart(
                    px.bar(
                        chart,
                        x="Passenger",
                        y="Model probability",
                        range_y=[0, 1],
                        color="Model probability",
                        color_continuous_scale=["#a43d35", "#d6a84f", "#0e3853"],
                    ),
                    use_container_width=True,
                )
                if st.button("Finish voyage", type="primary"):
                    advance_round()
                    st.rerun()

with tab_explain:
    st.subheader("Why did the model make that call?")
    st.write("This view shows association-based model signals, not causal explanations.")
    passenger = st.session_state.get("challenge")
    if passenger:
        current_row = passenger.passenger
        probability = predict_survival(bundle, pd.DataFrame([current_row]))
        st.metric("Current passenger probability", f"{probability:.1%}")
        frame = explanation_frame(bundle, pd.DataFrame([current_row]))
    else:
        frame = explanation_frame(bundle)
    if not frame.empty:
        frame["label"] = frame["feature"].str.replace("numeric__", "", regex=False).str.replace(
            "categorical__", "", regex=False
        )
        frame["label"] = frame["label"] + " · " + frame["direction"]
        st.plotly_chart(
            px.bar(
                frame.sort_values("impact"),
                x="impact",
                y="label",
                orientation="h",
                color="impact",
                color_continuous_scale=["#a43d35", "#d6a84f", "#0e3853"],
            ),
            use_container_width=True,
        )
        st.dataframe(frame[["label", "impact", "direction"]], hide_index=True, use_container_width=True)

with tab_history:
    st.subheader("The historical record")
    st.markdown(
        '<div class="history-card"><b>10 April 1912 · Southampton</b><br>The Titanic departed on its maiden voyage. The game uses passenger-level fields such as class, age, sex, fare, family connections, and embarkation port.</div>',
        unsafe_allow_html=True,
    )
    st.markdown(
        '<div class="history-card"><b>14 April 1912 · 23:40</b><br>The ship struck an iceberg. In this game, the uncertainty before the outcome is represented through the challenge mechanic—not through invented alternate history.</div>',
        unsafe_allow_html=True,
    )
    st.markdown(
        '<div class="history-card"><b>15 April 1912 · 02:20</b><br>The ship sank. Historical labels are used to evaluate guesses; they are not presented as a causal formula for individual survival.</div>',
        unsafe_allow_html=True,
    )
    st.info("Historical context is separate from model features. Sources are listed in data_sources.yml.")
    st.markdown(
        "[Kaggle Titanic dataset](https://www.kaggle.com/competitions/titanic/data) · "
        "[Encyclopaedia Britannica background](https://www.britannica.com/event/Titanic) · "
        "[Encyclopedia Titanica passenger research](https://www.encyclopedia-titanica.org/)"
    )

with tab_data:
    st.subheader("Data room")
    clean = prepare_features(df)
    a, b, c = st.columns(3)
    a.metric("Passengers", f"{len(df):,}")
    b.metric("Historical survival rate", f"{df['Survived'].mean():.1%}")
    c.metric("Missing cabin values", f"{df['Cabin'].isna().mean():.1%}")
    group = clean.groupby(["Pclass", "Sex"], as_index=False)["Survived"].mean()
    group["Group"] = group["Sex"].str.title() + " / class " + group["Pclass"].astype(str)
    st.plotly_chart(
        px.bar(
            group,
            x="Group",
            y="Survived",
            color="Sex",
            range_y=[0, 1],
            title="Historical survival rate by class and sex",
        ),
        use_container_width=True,
    )
    st.dataframe(df.head(20), hide_index=True, use_container_width=True)
    with st.expander("Data provenance and limitations"):
        st.write(
            "The local Titanic CSV is the primary reproducible source. Age and cabin have missing values; "
            "the model imputes age and groups missing cabin as unknown. The dataset is a historical sample "
            "and should not be used for real-world risk decisions."
        )
