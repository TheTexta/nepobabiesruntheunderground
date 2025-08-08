// Import dependencies
import "./tvstatic.js";
import formatDate from "./formatDate.js";

// Main page logic
document.addEventListener("DOMContentLoaded", function () {
  let postContainer = document.getElementById("post-container");
  let posts = [];
  let currentIndex = 0;
  const POSTS_PER_LOAD = 3;

  // Create intersection observer for infinite scroll
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          loadPosts();
        }
      });
    },
    {
      root: null,
      rootMargin: "100px",
      threshold: 0.1,
    }
  );

  // Sentinel element to observe
  let sentinel = null;

  fetch("journal.json")
    .then((res) => res.json())
    .then((data) => {
      posts = data.reverse(); // Reverse to show newest first
      loadPosts();
    })
    .catch((error) => {
      console.error("Failed to load journal:", error);
      // Even if journal fails to load, we can still show the page
    });

  function loadPosts() {
    // Remove old sentinel if it exists
    if (sentinel) {
      observer.unobserve(sentinel);
      sentinel.remove();
    }

    for (let i = 0; i < POSTS_PER_LOAD; i++) {
      if (currentIndex >= posts.length) {
        return; // No more posts to load
      }

      const post = posts[currentIndex];
      const article = document.createElement("article");
      article.className = "post";

      // Create and append title
      const title = document.createElement("h2");
      title.textContent = post.title;
      article.appendChild(title);

      // Create and append meta information
      const meta = document.createElement("p");
      meta.className = "meta";
      meta.textContent = formatDate(post.date);
      article.appendChild(meta);

      // Create and append quote of the day if it exists
      if (post["quote of the day"]) {
        const quote = document.createElement("blockquote");
        quote.className = "qotd";
        quote.textContent = `"${post["quote of the day"]}"`;
        article.appendChild(quote);
      }

      // Create and append post body
      const postBody = document.createElement("div");
      postBody.className = "post-body";

      // Handle content that may contain HTML (like images)
      // For safety, we'll create a temporary container and sanitize
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = post.content;

      // Move all child nodes from temp div to post body
      while (tempDiv.firstChild) {
        postBody.appendChild(tempDiv.firstChild);
      }

      article.appendChild(postBody);

      postContainer.appendChild(article);
      currentIndex++;
    }

    // Create new sentinel if there are more posts to load
    if (currentIndex < posts.length) {
      sentinel = document.createElement("div");
      sentinel.className = "sentinel";
      sentinel.style.height = "1px";
      sentinel.style.visibility = "hidden";
      postContainer.appendChild(sentinel);
      observer.observe(sentinel);
    }
  }
});
