---
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

---

::slide{#second}

# Second

A paragraph with a [link to the details](#details).

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

::slide{#last layout=center}

# The end
