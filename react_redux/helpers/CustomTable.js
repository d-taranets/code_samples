import React, { useState } from "react";
import TableHeadCellSorting from "./TableHeadCellSorting";

function CustomTable(props) {
	const [orderBy, setOrderBy] = useState(-1);
	const [orderAsc, setOrderAsc] = useState(true);

	const childrenWithProps =
		props.items &&
		props.items.map((item, index) =>
			React.Children.map(props.children, (child) =>
				React.cloneElement(child, { item: item, props })
			)
		);

	const onTitleArrowClick = (titleSlug) => {
        setOrderBy(titleSlug);
        setOrderAsc(!orderAsc);
		props.onArrowClick && props.onArrowClick(titleSlug, !orderAsc);
	};

	return (
		<table className={props.className}>
			<thead>
				<tr>
					{props.columns &&
						props.columns.map((field, index) => (
							<th
								style={field.style}
								className={field.className + "-th"}
								key={index}
							>
								<TableHeadCellSorting
									columnsSorting={["user", "date"]}
									isSort={field.titleSlug ? true : false}
									title={field.title}
									showArrowUp={
										orderBy === field.titleSlug &&
										!orderAsc
									}
									onArrowClick={() =>
										onTitleArrowClick(field.titleSlug)
									}
								/>
							</th>
						))}
				</tr>
			</thead>

			<tbody>{childrenWithProps}</tbody>

			<tfoot>
				<tr>
					{props.footer &&
						props.footer.map((field, index) => (
							<td
								colSpan={field.colspan ? field.colspan : 1}
								key={index}
							>
								{field.component}
							</td>
						))}
				</tr>
			</tfoot>
		</table>
	);
}

export default CustomTable;
