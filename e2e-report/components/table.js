export default function Table({ th, name, suitesTotal, total, passed }) {
  return (
    <table>
      <tbody>
        <tr>
          {th.map((header) => (
            <th key={header}>{header}</th>
          ))}
        </tr>
        <tr>
          <td>
            <h4>{name}</h4>
          </td>
          {suitesTotal && (
            <td>
              <h4>{suitesTotal}</h4>
            </td>
          )}
          <td>
            <h4>{total.toLocaleString()}</h4>
          </td>
          <td>
            <h4>{Math.round((passed / total) * 100)}%</h4>
          </td>
        </tr>
      </tbody>
    </table>
  )
}
