export default function Home() {
  return (
    <main>
      <form data-netlify="true" name="pizzaOrder" method="post">
        <input type="hidden" name="form-name" value="pizzaOrder" />
        <label>
          What order did the pizza give to the pineapple?
          <input name="order" type="text" />
        </label>
        <input type="submit" />
      </form>
    </main>
  )
}
