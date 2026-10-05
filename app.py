"""
app.py - Name Radar: Equity Skew vs. Price Positioning Dashboard
Streamlit + Plotly interactive institutional visualizer reading radar_data.json.
"""

import json
import os
import streamlit as st
import plotly.graph_objects as go
import pandas as pd

# Streamlit Page Config
st.set_page_config(
    page_title="Name Radar | Equity Skew vs. Price Positioning",
    page_icon="🎯",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom Institutional CSS styling
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
    
    html, body, [class*="css"] {
        font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
        color: #0F172A;
        background-color: #FAFAFA;
    }
    
    .stApp {
        background-color: #FAFAFA;
    }
    
    .main-header {
        border-bottom: 1px solid #E2E8F0;
        padding-bottom: 1rem;
        margin-bottom: 1.5rem;
    }
    
    .radar-card {
        background: #FFFFFF;
        border: 1px solid #E2E8F0;
        border-radius: 8px;
        padding: 1.25rem;
        margin-bottom: 1.5rem;
    }
    
    .quadrant-legend {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 0.75rem;
        margin-bottom: 1.25rem;
    }
    
    .legend-item {
        background: #FFFFFF;
        border: 1px solid #E2E8F0;
        border-radius: 6px;
        padding: 0.75rem;
    }
    
    .legend-title {
        font-size: 0.75rem;
        font-weight: 700;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        margin-bottom: 0.25rem;
    }
    
    .legend-desc {
        font-size: 0.75rem;
        color: #64748B;
        line-height: 1.3;
    }
    
    .mono {
        font-family: 'JetBrains Mono', monospace;
        font-variant-numeric: tabular-nums;
    }
</style>
""", unsafe_allow_html=True)

DEFAULT_WATCHLIST = ["IONQ", "LUNR", "RDW", "ACHR", "ONDS", "RGTI", "PLTR", "SMCI"]

@st.cache_data(ttl=60)
def load_data(filepath="radar_data.json"):
    if not os.path.exists(filepath):
        return None
    try:
        with open(filepath, "r") as f:
            data = json.load(f)
            return data
    except Exception as e:
        st.error(f"Error loading {filepath}: {e}")
        return None

# Top Bar Header
st.markdown("""
<div class="main-header">
    <div style="display: flex; justify-content: space-between; align-items: flex-end;">
        <div>
            <h1 style="font-size: 1.6rem; font-weight: 700; margin: 0; color: #0F172A; letter-spacing: -0.02em;">Name Radar</h1>
            <p style="margin: 0.25rem 0 0 0; color: #64748B; font-size: 0.875rem;">Institutional Options Skew vs. Stock Price Positioning Dashboard (30–45 DTE)</p>
        </div>
        <div style="font-size: 0.75rem; color: #94A3B8; text-align: right;" class="mono">
            Formula: Skew = (IV<sub>25Δ Put</sub> - IV<sub>25Δ Call</sub>) / IV<sub>ATM</sub>
        </div>
    </div>
</div>
""", unsafe_allow_html=True)

# Sidebar Controls
with st.sidebar:
    st.subheader("Radar Controls")
    
    # Horizon Switcher
    horizon_label = st.radio(
        "Return Horizon",
        options=["1 Day", "1 Week", "1 Month"],
        index=2,
        horizontal=True,
        help="Select the lookback period for price returns on the X-axis."
    )
    horizon_key = {"1 Day": "ret_1d", "1 Week": "ret_1w", "1 Month": "ret_1m"}[horizon_label]
    
    st.divider()
    
    # Watchlist Management
    st.subheader("Active Watchlist")
    st.caption("Watchlist names appear as larger amber nodes (#F59E0B) with persistent ticker labels.")
    
    user_watchlist_input = st.text_area(
        "Watchlist Tickers (comma separated)",
        value=", ".join(DEFAULT_WATCHLIST),
        height=100
    )
    watchlist_set = {t.strip().upper() for t in user_watchlist_input.split(",") if t.strip()}
    
    # Quick filter
    filter_quadrant = st.selectbox(
        "Highlight Quadrant",
        ["All Quadrants", "Contrarian Bid (Focus)", "Fear", "Hedged Rally", "Chase"]
    )
    
    hide_thin = st.checkbox("Hide Thin Chains (OI < 30 or Vol < 5)", value=False)
    
    st.divider()
    if st.button("🔄 Pull Live Yahoo Finance Data", use_container_width=True):
        import subprocess
        with st.spinner("Fetching live options chains and quotes from Yahoo Finance..."):
            subprocess.run(["python3", "scanner.py", "--workers", "4"])
            st.cache_data.clear()
            st.success("Live data refreshed!")
            st.rerun()

    st.caption("Data source: Live / Delayed Yahoo Finance Options & Hist. Chains. Skew normalized by ATM IV.")

# Load Data
data = load_data("radar_data.json")

if not data or "records" not in data or len(data["records"]) == 0:
    st.warning("No radar data found. Run `python scanner.py` to scan your universe.")
    if st.button("Generate Sample Demo Radar Data"):
        import subprocess
        st.info("Running scanner.py on core universe...")
        subprocess.run(["python3", "scanner.py", "--workers", "4", "--tickers", "NVDA,AAPL,TSLA,IONQ,LUNR,RDW,ACHR,ONDS,RGTI,PLTR,SMCI,AMD,COIN,MSTR,SOFI,HOOD,SPY,QQQ"])
        st.rerun()
    st.stop()

records = data["records"]
df = pd.DataFrame(records)

# Filter out thin if requested
if hide_thin:
    df = df[~df["thin"]]

# Calculate dynamic range for Plotly chart
x_vals = df[horizon_key]
y_vals = df["skew"]

x_max = max(abs(x_vals.min()), abs(x_vals.max()), 15.0) * 1.15
y_max = max(abs(y_vals.min()), abs(y_vals.max()), 25.0) * 1.15

# Quadrant Informational Legend
st.markdown("""
<div class="quadrant-legend">
    <div class="legend-item" style="border-left: 3px solid #EF4444;">
        <div class="legend-title" style="color: #DC2626;">Top-Left · FEAR</div>
        <div class="legend-desc">Return &lt; 0%, Skew &gt; 0%<br>Stock falling and downside puts bid. Do not catch falling knives.</div>
    </div>
    <div class="legend-item" style="border-left: 3px solid #3B82F6;">
        <div class="legend-title" style="color: #2563EB;">Top-Right · HEDGED RALLY</div>
        <div class="legend-desc">Return &gt; 0%, Skew &gt; 0%<br>Stock rising, but protection bid. Rally distrusted; tighten stops.</div>
    </div>
    <div class="legend-item" style="border-left: 3px solid #10B981; background: #F0FDF4;">
        <div class="legend-title" style="color: #059669;">Bottom-Left · CONTRARIAN BID ★</div>
        <div class="legend-desc">Return &lt; 0%, Skew &lt; 0%<br>Stock fell, but calls bid. Options flow disagrees with price drop. High conviction.</div>
    </div>
    <div class="legend-item" style="border-left: 3px solid #8B5CF6;">
        <div class="legend-title" style="color: #7C3AED;">Bottom-Right · CHASE</div>
        <div class="legend-desc">Return &gt; 0%, Skew &lt; 0%<br>Stock rising and calls bid. Momentum confirmed, but crowded.</div>
    </div>
</div>
""", unsafe_allow_html=True)

# Build Plotly Chart
fig = go.Figure()

# 1. Subtle Shading for Bottom-Left (CONTRARIAN BID) Quadrant: x < 0, y < 0
fig.add_shape(
    type="rect",
    x0=-x_max, y0=-y_max,
    x1=0, y1=0,
    fillcolor="rgba(16, 185, 129, 0.08)",
    line=dict(width=0),
    layer="below"
)

# 2. Large Watermark Quadrant Titles in Corners
fig.add_annotation(
    x=-x_max * 0.92, y=y_max * 0.90,
    text="<b>FEAR</b><br><span style='font-size:10px; color:#94A3B8;'>Downside Protection Bid</span>",
    showarrow=False,
    font=dict(size=14, color="rgba(100, 116, 139, 0.4)", family="Plus Jakarta Sans"),
    align="left",
    xanchor="left"
)
fig.add_annotation(
    x=x_max * 0.92, y=y_max * 0.90,
    text="<b>HEDGED RALLY</b><br><span style='font-size:10px; color:#94A3B8;'>Rally Distrusted</span>",
    showarrow=False,
    font=dict(size=14, color="rgba(100, 116, 139, 0.4)", family="Plus Jakarta Sans"),
    align="right",
    xanchor="right"
)
fig.add_annotation(
    x=-x_max * 0.92, y=-y_max * 0.90,
    text="<b>CONTRARIAN BID</b><br><span style='font-size:10px; color:#059669;'>★ Upside Call Accumulation</span>",
    showarrow=False,
    font=dict(size=14, color="rgba(5, 150, 105, 0.65)", family="Plus Jakarta Sans"),
    align="left",
    xanchor="left"
)
fig.add_annotation(
    x=x_max * 0.92, y=-y_max * 0.90,
    text="<b>CHASE</b><br><span style='font-size:10px; color:#94A3B8;'>Momentum Confirmed / Crowded</span>",
    showarrow=False,
    font=dict(size=14, color="rgba(100, 116, 139, 0.4)", family="Plus Jakarta Sans"),
    align="right",
    xanchor="right"
)

# Split records into 4 rendering categories:
# 1. Covered Regular
# 2. Covered Thin
# 3. Watchlist Regular
# 4. Watchlist Thin
df["is_watchlist"] = df["ticker"].isin(watchlist_set)

# Helper function for hover text
def make_hover(row):
    return (
        f"<b>{row['ticker']}</b><br>"
        f"Price: ${row['price']:.2f}<br>"
        f"{horizon_label} Return: {row[horizon_key]:+.2f}%<br>"
        f"Options Skew: {row['skew']:+.2f}%<br>"
        f"ATM IV: {row['atm_iv']:.1f}%<br>"
        f"Put 25Δ IV: {row['put_25_iv']:.1f}% | Call 25Δ IV: {row['call_25_iv']:.1f}%<br>"
        f"DTE: {row['dte']}d ({row['expiration']})<br>"
        f"Liquidity: {'⚠️ Thin (OI < 30 or Vol < 5)' if row['thin'] else '✓ Institutional Liquid'}"
    )

df["hover_text"] = df.apply(make_hover, axis=1)

# Category 1: Covered Liquid (Light blue solid circles #93C5FD)
sub_cov_liq = df[(~df["is_watchlist"]) & (~df["thin"])]
if not sub_cov_liq.empty:
    fig.add_trace(go.Scatter(
        x=sub_cov_liq[horizon_key],
        y=sub_cov_liq["skew"],
        mode="markers",
        name="Covered Names (Liquid)",
        marker=dict(
            size=9,
            color="#93C5FD",
            line=dict(width=1, color="#60A5FA"),
            opacity=0.85
        ),
        text=sub_cov_liq["ticker"],
        hoverinfo="text",
        hovertext=sub_cov_liq["hover_text"]
    ))

# Category 2: Covered Thin (Hollow circles - white fill with light blue border)
sub_cov_thin = df[(~df["is_watchlist"]) & (df["thin"])]
if not sub_cov_thin.empty:
    fig.add_trace(go.Scatter(
        x=sub_cov_thin[horizon_key],
        y=sub_cov_thin["skew"],
        mode="markers",
        name="Covered (Thin Chain)",
        marker=dict(
            size=9,
            color="rgba(255, 255, 255, 0.95)",
            line=dict(width=1.8, color="#93C5FD")
        ),
        text=sub_cov_thin["ticker"],
        hoverinfo="text",
        hovertext=sub_cov_thin["hover_text"]
    ))

# Category 3: Watchlist Liquid (Amber solid circles #F59E0B with permanent label)
sub_wtc_liq = df[(df["is_watchlist"]) & (~df["thin"])]
if not sub_wtc_liq.empty:
    fig.add_trace(go.Scatter(
        x=sub_wtc_liq[horizon_key],
        y=sub_wtc_liq["skew"],
        mode="markers+text",
        name="Watchlist (Liquid)",
        text=sub_wtc_liq["ticker"],
        textposition="top center",
        textfont=dict(size=11, family="JetBrains Mono", color="#B45309"),
        marker=dict(
            size=14,
            color="#F59E0B",
            line=dict(width=1.5, color="#D97706"),
            opacity=0.95
        ),
        hoverinfo="text",
        hovertext=sub_wtc_liq["hover_text"]
    ))

# Category 4: Watchlist Thin (Hollow Amber circles)
sub_wtc_thin = df[(df["is_watchlist"]) & (df["thin"])]
if not sub_wtc_thin.empty:
    fig.add_trace(go.Scatter(
        x=sub_wtc_thin[horizon_key],
        y=sub_wtc_thin["skew"],
        mode="markers+text",
        name="Watchlist (Thin Chain)",
        text=sub_wtc_thin["ticker"],
        textposition="top center",
        textfont=dict(size=11, family="JetBrains Mono", color="#D97706"),
        marker=dict(
            size=14,
            color="rgba(255, 255, 255, 0.95)",
            line=dict(width=2.5, color="#F59E0B")
        ),
        hoverinfo="text",
        hovertext=sub_wtc_thin["hover_text"]
    ))

# Crosshairs & Axis Layout
fig.update_layout(
    plot_bgcolor="#FFFFFF",
    paper_bgcolor="#FAFAFA",
    height=640,
    margin=dict(l=60, r=40, t=30, b=60),
    xaxis=dict(
        title=dict(
            text=f"<b>Price Return ({horizon_label}) %</b>",
            font=dict(family="Plus Jakarta Sans", size=13, color="#475569")
        ),
        range=[-x_max, x_max],
        zeroline=True,
        zerolinewidth=1.5,
        zerolinecolor="#94A3B8",
        gridcolor="#E2E8F0",
        gridwidth=0.8,
        ticksuffix="%",
        tickfont=dict(family="JetBrains Mono", size=11, color="#64748B")
    ),
    yaxis=dict(
        title=dict(
            text="<b>Normalized 25Δ Options Skew %</b> [(Put 25Δ IV - Call 25Δ IV) / ATM IV]",
            font=dict(family="Plus Jakarta Sans", size=13, color="#475569")
        ),
        range=[-y_max, y_max],
        zeroline=True,
        zerolinewidth=1.5,
        zerolinecolor="#94A3B8",
        gridcolor="#E2E8F0",
        gridwidth=0.8,
        ticksuffix="%",
        tickfont=dict(family="JetBrains Mono", size=11, color="#64748B")
    ),
    legend=dict(
        orientation="h",
        yanchor="bottom",
        y=1.02,
        xanchor="right",
        x=1,
        font=dict(family="Plus Jakarta Sans", size=11, color="#475569"),
        bgcolor="rgba(255,255,255,0.8)"
    ),
    hoverlabel=dict(
        bgcolor="#0F172A",
        font_size=12,
        font_family="Plus Jakarta Sans",
        font_color="#F8FAFC"
    )
)

st.plotly_chart(fig, use_container_width=True)

# ----------------------------------------------------
# Bottom Section: "The Action List"
# ----------------------------------------------------
st.markdown("""
<div style="margin-top: 1.5rem; margin-bottom: 0.75rem;">
    <h3 style="font-size: 1.25rem; font-weight: 700; color: #0F172A; margin: 0;">
        The Action List · Contrarian Bid Opportunities
    </h3>
    <p style="font-size: 0.825rem; color: #64748B; margin: 0.25rem 0 0 0;">
        Stocks falling over the period (Return &lt; 0%), but institutional options flow is aggressively paying up for upside calls (Skew &lt; 0%). 
        Sorted by lowest skew (strongest call demand).
    </p>
</div>
""", unsafe_allow_html=True)

# Filter for Contrarian Bid names in current horizon
contrarian_df = df[(df[horizon_key] < 0) & (df["skew"] < 0)].copy()

if contrarian_df.empty:
    st.info(f"No names currently in Contrarian Bid quadrant under the {horizon_label} horizon.")
else:
    # Sort by lowest skew first
    contrarian_df = contrarian_df.sort_values(by="skew", ascending=True)
    
    # Format table for institutional presentation
    display_df = contrarian_df[[
        "ticker", "price", horizon_key, "skew", "atm_iv", 
        "call_25_iv", "put_25_iv", "dte", "thin"
    ]].copy()
    
    display_df.columns = [
        "Ticker", "Price ($)", f"Return ({horizon_label})", "Skew (%)", 
        "ATM IV (%)", "Call 25Δ IV (%)", "Put 25Δ IV (%)", "DTE", "Thin Liquidity"
    ]
    
    # Formatting
    st.dataframe(
        display_df.style
            .format({
                "Price ($)": "${:.2f}",
                f"Return ({horizon_label})": "{:+.2f}%",
                "Skew (%)": "{:+.2f}%",
                "ATM IV (%)": "{:.1f}%",
                "Call 25Δ IV (%)": "{:.1f}%",
                "Put 25Δ IV (%)": "{:.1f}%",
                "DTE": "{:d}d",
                "Thin Liquidity": lambda x: "⚠️ Thin" if x else "✓ Liquid"
            })
            .applymap(lambda v: "color: #059669; font-weight: 600;", subset=["Skew (%)"])
            .applymap(lambda v: "color: #DC2626;", subset=[f"Return ({horizon_label})"]),
        use_container_width=True,
        hide_index=True
    )
    
    st.caption(f"Showing {len(contrarian_df)} names in Contrarian Bid quadrant. Permanent watchlist members are highlighted in amber above.")
