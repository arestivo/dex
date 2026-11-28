---
# Pinned, so the committed diagram cache stays valid whatever dex.yaml says.
theme: default
# Published, so the e2e build has the notes the presenter tests read.
publishNotes: true
title: Viewer test deck
subtitle: Fixture for the e2e tests
author: Test Author
---

::slide{#title layout=title}

---

::slide{#index layout=section}

# Index

::toc

---

::slide{#basics layout=section}

# Basics

---

::slide{#first}

# First

- One
- Two
- A **pre**flight check

:::notes
Mention the **third** item first.

- then the others
:::

---

::slide{#second}

# Second

A paragraph with a [link to the details](#details).

Each preflight costs a round trip.

---

::slide{#third}

# Third

![A blue box](assets/box.svg)

---

::slide{#details layout=section}

# Details

---

::slide{#code}

# Code

```php
<?php echo "Hello"; ?>
```

---

::slide{#motto layout=quote}

Simplicity is prerequisite for reliability.

::slot{name=source}

Edsger W. Dijkstra

---

::slide{#diagram}

# Diagram

```tikz alt="Decide leads to Act, which leads to Observe."
\begin{tikzpicture}[node distance=8mm]
  \node[box] (d) {\textbf{Decide}};
  \node[key,right=of d] (a) {\textbf{Act}};
  \node[box,right=of a] (o) {\textbf{Observe}};
  \draw[go] (d)--(a);
  \draw[go] (a)--(o);
\end{tikzpicture}
```

---

::slide{#banner layout=banner}

# Deck layout

This layout belongs to this deck only.

---

::slide{#reveal layout=two-columns}

# Reveal

Always shown.

::slot{name=left}

:::steps
- Ask the room
- Wait for hands
:::

::slot{name=right}

:::step
Right column
:::

The answer is :step[forty-two].

---

::slide{#last layout=center}

# The end

Função e fim.
